/** IANA timezone for Morocco (dashboard "today" and reporting). */
export const MOROCCO_TIMEZONE = "Africa/Casablanca"

/**
 * Module-level cached formatter.
 *
 * BEFORE: `new Intl.DateTimeFormat(...)` was created on every `getCasablancaDateKey`
 * call — ~50 µs each. For a 30-day window that function is called ~57,600 times
 * (30 days × 1,920 minute-loop iterations), costing ~2.88 s of pure JS before any
 * DB query fires.
 *
 * AFTER: one allocation per Node.js process instance; subsequent calls are ~2 µs.
 */
const _casablancaDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: MOROCCO_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/**
 * Calendar date `YYYY-MM-DD` in `Africa/Casablanca` for the given instant.
 */
export function getCasablancaDateKey(instant: Date = new Date()): string {
  return _casablancaDateFmt.format(instant)
}

/**
 * First UTC instant where the Casablanca calendar is `dateKey` (inclusive start of
 * that day).
 *
 * Uses binary search over a tight 4-hour window:
 * Morocco is UTC+0 (WET) or UTC+1 (WEST), so midnight Casablanca time falls in
 * [UTC prev-day 22:00, UTC same-day 02:00].
 * Binary search over ~14,400,000 ms → ≈ 24 iterations (was: full-day linear scan).
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

  // Morocco offset is 0 or +1 h → midnight Casablanca is within [prev 22:00, 02:00 UTC]
  let lo = Date.UTC(y, mo - 1, da - 1, 22, 0, 0)
  let hi = Date.UTC(y, mo - 1, da, 2, 0, 0)

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const key = getCasablancaDateKey(new Date(mid))
    if (key < dateKey) lo = mid + 1
    else hi = mid
  }
  return new Date(lo)
}

/**
 * Exclusive end of the Casablanca calendar day `dateKey` (first instant of the next
 * day in UTC).
 *
 * BEFORE: minute-by-minute scan up to 32 h = 1,920 iterations per call.
 * AFTER:  binary search over [start+22h, start+26h] → ≈ 24 iterations per call.
 *
 * Morocco days are 23–25 h long (DST transitions add/remove 1 h), so searching
 * a 4-hour window around the expected boundary is always sufficient.
 */
export function endExclusiveOfCasablancaDayUtc(dateKey: string): Date {
  const start = startOfCasablancaDayUtc(dateKey)

  // Binary search: find first instant whose Casablanca date is NOT dateKey.
  // Search window: [start+22h … start+26h] — safely brackets any DST boundary.
  let lo = start.getTime() + 22 * 60 * 60 * 1000
  let hi = start.getTime() + 26 * 60 * 60 * 1000

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (getCasablancaDateKey(new Date(mid)) === dateKey) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return new Date(lo)
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

/** Next calendar day key after `dateKey` (Casablanca). */
export function nextCasablancaDateKey(dateKey: string): string {
  const ex = endExclusiveOfCasablancaDayUtc(dateKey)
  return getCasablancaDateKey(ex)
}

/** Walk calendar days in Casablanca (`deltaDays` may be negative). */
export function offsetCasablancaDateKey(dateKey: string, deltaDays: number): string {
  let key = dateKey
  const steps = Math.abs(deltaDays)
  const forward = deltaDays > 0
  for (let i = 0; i < steps; i++) {
    key = forward ? nextCasablancaDateKey(key) : previousCasablancaDateKey(key)
  }
  return key
}

/** Inclusive list of `YYYY-MM-DD` keys from `startKey` through `endKey` (Casablanca). */
export function enumerateCasablancaDateKeysInclusive(
  startKey: string,
  endKey: string
): string[] {
  const out: string[] = []
  let k = startKey
  for (;;) {
    out.push(k)
    if (k === endKey) break
    k = nextCasablancaDateKey(k)
    if (out.length > 400) throw new Error("enumerateCasablancaDateKeysInclusive: range too large")
  }
  return out
}

/** Inclusive day count between two Casablanca date keys. */
export function countCasablancaDaysInclusive(startKey: string, endKey: string): number {
  return enumerateCasablancaDateKeysInclusive(startKey, endKey).length
}