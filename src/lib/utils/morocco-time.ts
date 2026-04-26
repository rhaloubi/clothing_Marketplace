/** IANA timezone for Morocco (dashboard "today" and reporting). */
export const MOROCCO_TIMEZONE = "Africa/Casablanca"

/**
 * Calendar date `YYYY-MM-DD` in `Africa/Casablanca` for the given instant.
 */
export function getCasablancaDateKey(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MOROCCO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant)
}

/**
 * First UTC instant where the Casablanca calendar is `dateKey` (inclusive start of that day).
 */
export function startOfCasablancaDayUtc(dateKey: string): Date {
  const parts = dateKey.split("-").map((s) => Number.parseInt(s, 10))
  const y = parts[0]
  const mo = parts[1]
  const da = parts[2]
  if (
    y === undefined ||
    mo === undefined ||
    da === undefined ||
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(da)
  ) {
    throw new Error(`Invalid dateKey: ${dateKey}`)
  }
  let lo = Date.UTC(y, mo - 1, da - 1, 0, 0, 0)
  let hi = Date.UTC(y, mo - 1, da + 1, 0, 0, 0)
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const key = getCasablancaDateKey(new Date(mid))
    if (key < dateKey) lo = mid + 1
    else hi = mid
  }
  return new Date(lo)
}

/**
 * Exclusive end of the Casablanca calendar day `dateKey` (first instant of the next day).
 */
export function endExclusiveOfCasablancaDayUtc(dateKey: string): Date {
  const start = startOfCasablancaDayUtc(dateKey)
  const maxProbe = start.getTime() + 32 * 60 * 60 * 1000
  for (let t = start.getTime() + 60 * 1000; t <= maxProbe; t += 60 * 1000) {
    if (getCasablancaDateKey(new Date(t)) !== dateKey) {
      return new Date(t)
    }
  }
  return new Date(start.getTime() + 26 * 60 * 60 * 1000)
}

export function getCasablancaDayBoundsUtc(instant: Date = new Date()): {
  dateKey: string
  startUtc: Date
  endExclusiveUtc: Date
} {
  const dateKey = getCasablancaDateKey(instant)
  const startUtc = startOfCasablancaDayUtc(dateKey)
  const endExclusiveUtc = endExclusiveOfCasablancaDayUtc(dateKey)
  return { dateKey, startUtc, endExclusiveUtc }
}

/** Previous calendar day key relative to `dateKey` (Casablanca). */
export function previousCasablancaDateKey(dateKey: string): string {
  const start = startOfCasablancaDayUtc(dateKey)
  return getCasablancaDateKey(new Date(start.getTime() - 1))
}
