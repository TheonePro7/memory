/* 通用 fetch 封装 — 错误拦截 + 自动重试 1 次 */

const RETRY_STATUSES = new Set([408, 429, 502, 503, 504]);

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
  /** 注入自定义 signal 以支持调用方取消 */
  signal?: AbortSignal;
}

export async function apiFetch<T = unknown>(url: string, opts?: FetchOptions): Promise<T> {
  const doFetch = (): Promise<T> =>
    fetch(url, opts).then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new ApiError(res.status, body || res.statusText);
      }
      return res.json() as Promise<T>;
    });

  try {
    return await doFetch();
  } catch (err) {
    if (err instanceof ApiError && RETRY_STATUSES.has(err.status)) {
      return doFetch();
    }
    throw err;
  }
}
