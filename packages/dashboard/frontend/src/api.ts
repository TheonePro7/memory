/* 通用 fetch 封装 — 错误拦截 + 自动重试 1 次 + 10s 超时 */

const RETRY_STATUSES = new Set([408, 429, 502, 503, 504]);
const FETCH_TIMEOUT = 10_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface FetchOptions extends RequestInit {
  signal?: AbortSignal;
  /** 自定义超时（毫秒），默认 10s */
  timeout?: number;
}

export async function apiFetch<T = unknown>(url: string, opts?: FetchOptions): Promise<T> {
  const timeout = opts?.timeout ?? FETCH_TIMEOUT;

  const doFetch = () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const combined = opts?.signal
      ? anySignal([opts.signal, controller.signal])
      : controller.signal;

    return fetch(url, { ...opts, signal: combined })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new ApiError(res.status, body || res.statusText);
        }
        return res.json() as Promise<T>;
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        throw err;
      });
  };

  try {
    return await doFetch();
  } catch (err) {
    if (err instanceof ApiError && RETRY_STATUSES.has(err.status)) {
      return doFetch();
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("请求超时");
    }
    throw err;
  }
}

/* 合并多个 AbortSignal —— 任一信号触发则中止 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}
