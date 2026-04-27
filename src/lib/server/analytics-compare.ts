import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import type {
  AnalyticsComparePreset,
  AnalyticsRevenueCompareChartRow,
  AnalyticsRevenueCompareSnapshot,
  AnalyticsEventType,
  RevenueDataPoint,
} from "@/types"
import { resolveAnalyticsDateWindow } from "@/lib/server/analytics-query"
import { runAnalyticsRpc } from "@/lib/server/analytics-rpc"
import {
  MOROCCO_TIMEZONE,
  enumerateCasablancaDateKeysInclusive,
  offsetCasablancaDateKey,
  previousCasablancaDateKey,
  startOfCasablancaDayUtc,
} from "@/lib/utils/morocco-time"

type SB = SupabaseClient<Database>

export const ANALYTICS_COMPARE_EVENT_TYPES: AnalyticsEventType[] = [
  "page_view",
  "product_view",
  "cart_add",
  "cart_remove",
  "checkout_start",
  "checkout_abandon",
  "order_placed",
  "order_delivered",
  "order_returned",
]

function formatRangeLabelFr(startDateKey: string, endDateKeyInclusive: string): string {
  const d1 = startOfCasablancaDayUtc(startDateKey)
  const d2 = startOfCasablancaDayUtc(endDateKeyInclusive)
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: MOROCCO_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  return `${fmt.format(d1)} – ${fmt.format(d2)}`
}

function shortDayLabel(dateKey: string): string {
  const d = startOfCasablancaDayUtc(dateKey)
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: MOROCCO_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(d)
}

export function resolveRollingCompareRangesCasablanca(
  preset: AnalyticsComparePreset,
  custom?: { from?: string; to?: string },
  now: Date = new Date()
): {
  n: number
  current: {
    start_date_key: string
    end_date_key_inclusive: string
    from_inclusive_iso: string
    to_exclusive_iso: string
  }
  previous: {
    start_date_key: string
    end_date_key_inclusive: string
    from_inclusive_iso: string
    to_exclusive_iso: string
  }
} {
  const currentWindow = resolveAnalyticsDateWindow({
    preset,
    from: custom?.from,
    to: custom?.to,
    now,
  })
  const n = currentWindow.day_count
  const todayKey = currentWindow.end_date_key_inclusive
  const startKey = currentWindow.start_date_key

  const prevEndKey = previousCasablancaDateKey(startKey)
  const prevStartKey = offsetCasablancaDateKey(prevEndKey, -(n - 1))
  const previousFrom = startOfCasablancaDayUtc(prevStartKey).toISOString()
  const previousToExclusive = startOfCasablancaDayUtc(startKey).toISOString()

  return {
    n,
    current: {
      start_date_key: startKey,
      end_date_key_inclusive: todayKey,
      from_inclusive_iso: currentWindow.from_inclusive_iso,
      to_exclusive_iso: currentWindow.to_exclusive_iso,
    },
    previous: {
      start_date_key: prevStartKey,
      end_date_key_inclusive: prevEndKey,
      from_inclusive_iso: previousFrom,
      to_exclusive_iso: previousToExclusive,
    },
  }
}

async function fetchOrdersForRange(
  supabase: SB,
  storeId: string,
  fromInclusiveIso: string,
  toExclusiveIso: string
): Promise<Array<{ date_key: string; revenue_mad: number; revenue_orders: number }>> {
  const fromDate = fromInclusiveIso.slice(0, 10)
  const toDate = new Date(new Date(toExclusiveIso).getTime() - 1000).toISOString().slice(0, 10)
  const countRows = await runAnalyticsRpc<{ rows_count: number }>(
    supabase,
    "analytics_daily_orders_rows_count",
    {
      p_store_id: storeId,
      p_from: fromDate,
      p_to: toDate,
    }
  )
  const count = Number(countRows[0]?.rows_count ?? 0)

  const fn = count > 0
    ? "analytics_overview_daily_from_daily"
    : "analytics_overview_daily_agg"

  return runAnalyticsRpc<{ date_key: string; revenue_mad: number; revenue_orders: number }>(
    supabase,
    fn,
    {
    p_store_id: storeId,
    p_from: fromInclusiveIso,
    p_to: toExclusiveIso,
    p_tz: "Africa/Casablanca",
    }
  )
}

function revenueSeriesForKeys(
  keys: string[],
  byDay: Map<string, { revenue: number; orders: number }>
): RevenueDataPoint[] {
  return keys.map((date) => {
    const v = byDay.get(date) ?? { revenue: 0, orders: 0 }
    return { date, revenue: v.revenue, orders: v.orders }
  })
}

function totalsFromRevenueSeries(series: RevenueDataPoint[]): {
  revenue_mad: number
  orders: number
  avg_order_mad: number
} {
  let revenue_mad = 0
  let orders = 0
  for (const p of series) {
    revenue_mad += p.revenue
    orders += p.orders
  }
  const avg_order_mad =
    orders > 0 ? Math.round(revenue_mad / orders) : 0
  return { revenue_mad, orders, avg_order_mad }
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export async function fetchAnalyticsRevenueCompareSnapshot(
  supabase: SB,
  storeId: string,
  preset: AnalyticsComparePreset,
  custom?: { from?: string; to?: string }
): Promise<AnalyticsRevenueCompareSnapshot> {
  const ranges = resolveRollingCompareRangesCasablanca(preset, custom)
  const currentKeys = enumerateCasablancaDateKeysInclusive(
    ranges.current.start_date_key,
    ranges.current.end_date_key_inclusive
  )
  const previousKeys = enumerateCasablancaDateKeysInclusive(
    ranges.previous.start_date_key,
    ranges.previous.end_date_key_inclusive
  )

  const [
    curOrders,
    prevOrders,
  ] = await Promise.all([
    fetchOrdersForRange(
      supabase,
      storeId,
      ranges.current.from_inclusive_iso,
      ranges.current.to_exclusive_iso
    ),
    fetchOrdersForRange(
      supabase,
      storeId,
      ranges.previous.from_inclusive_iso,
      ranges.previous.to_exclusive_iso
    ),
  ])

  const curByDay = new Map<string, { revenue: number; orders: number }>(
    curOrders.map((r) => [r.date_key, { revenue: Number(r.revenue_mad), orders: Number(r.revenue_orders) }])
  )
  const prevByDay = new Map<string, { revenue: number; orders: number }>(
    prevOrders.map((r) => [r.date_key, { revenue: Number(r.revenue_mad), orders: Number(r.revenue_orders) }])
  )
  const series_current = revenueSeriesForKeys(currentKeys, curByDay)
  const series_previous = revenueSeriesForKeys(previousKeys, prevByDay)

  const chart_rows: AnalyticsRevenueCompareChartRow[] = []
  const n = ranges.n
  for (let i = 0; i < n; i++) {
    const cur = series_current[i]
    const prev = series_previous[i]
    if (!cur || !prev) break
    chart_rows.push({
      dayIndex: i + 1,
      labelShort: shortDayLabel(cur.date),
      current_revenue: cur.revenue,
      previous_revenue: prev.revenue,
      current_orders: cur.orders,
      previous_orders: prev.orders,
    })
  }

  const curTotals = totalsFromRevenueSeries(series_current)
  const prevTotals = totalsFromRevenueSeries(series_previous)

  return {
    preset,
    window: resolveAnalyticsDateWindow({
      preset,
      from: custom?.from,
      to: custom?.to,
    }),
    current_range: {
      from_inclusive_iso: ranges.current.from_inclusive_iso,
      to_exclusive_iso: ranges.current.to_exclusive_iso,
      start_date_key: ranges.current.start_date_key,
      end_date_key_inclusive: ranges.current.end_date_key_inclusive,
      label_fr: formatRangeLabelFr(
        ranges.current.start_date_key,
        ranges.current.end_date_key_inclusive
      ),
    },
    previous_range: {
      from_inclusive_iso: ranges.previous.from_inclusive_iso,
      to_exclusive_iso: ranges.previous.to_exclusive_iso,
      start_date_key: ranges.previous.start_date_key,
      end_date_key_inclusive: ranges.previous.end_date_key_inclusive,
      label_fr: formatRangeLabelFr(
        ranges.previous.start_date_key,
        ranges.previous.end_date_key_inclusive
      ),
    },
    chart_rows,
    summary: {
      current: curTotals,
      previous: prevTotals,
      delta_revenue_pct: pctDelta(curTotals.revenue_mad, prevTotals.revenue_mad),
      delta_orders_pct: pctDelta(curTotals.orders, prevTotals.orders),
      delta_avg_order_pct: pctDelta(curTotals.avg_order_mad, prevTotals.avg_order_mad),
    },
  }
}
