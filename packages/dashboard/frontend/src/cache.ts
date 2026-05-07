/* 简易 sessionStorage 缓存层 — 同一页面多次 mount 不重复请求 */
/* key 格式: fetch:<url> , TTL: 2 分钟（页面内缓存够用） */

const CACHE_PREFIX = "fetch:";
const CACHE_TTL = 120_000; // 2 分钟

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export function getCache<T>(url: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiry) {
      sessionStorage.removeItem(CACHE_PREFIX + url);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(url: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, expiry: Date.now() + CACHE_TTL };
    sessionStorage.setItem(CACHE_PREFIX + url, JSON.stringify(entry));
  } catch {
    // sessionStorage 满或不可用时静默忽略
  }
}

export function invalidateCache(prefix?: string): void {
  try {
    const keys = Object.keys(sessionStorage);
    const prefixMatch = CACHE_PREFIX + (prefix ?? "");
    keys.forEach((k) => {
      if (k.startsWith(prefixMatch)) sessionStorage.removeItem(k);
    });
  } catch {
    // 静默忽略
  }
}
