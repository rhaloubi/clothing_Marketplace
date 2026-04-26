const TTL_MS = 60_000

type Entry<T> = { expiresAt: number; value: T }

function cacheMap(): Map<string, Entry<unknown>> {
  const g = globalThis as typeof globalThis & {
    __analytics_cache__?: Map<string, Entry<unknown>>
  }
  g.__analytics_cache__ ??= new Map<string, Entry<unknown>>()
  return g.__analytics_cache__
}

export async function withAnalyticsCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  const map = cacheMap()
  const now = Date.now()
  const hit = map.get(key)
  if (hit && hit.expiresAt > now) return hit.value as T
  const value = await load()
  map.set(key, { value, expiresAt: now + TTL_MS })
  return value
}
