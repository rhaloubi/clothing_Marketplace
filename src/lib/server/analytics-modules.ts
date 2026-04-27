import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  AnalyticsBreakdownSnapshot,
  AnalyticsCancellationSnapshot,
  AnalyticsDateWindow,
  AnalyticsFulfillmentSnapshot,
  AnalyticsOverviewSnapshot,
  AnalyticsPeakHoursSnapshot,
  AnalyticsRevenueSnapshot,
  RevenueDataPoint,
} from "@/types"
import type { Database } from "@/types/database.types"
import { runAnalyticsRpc } from "@/lib/server/analytics-rpc"

type SB = SupabaseClient<Database>

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 10000) / 100
}

function secondsToHms(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0
  const hh = String(Math.floor(s / 3600)).padStart(2, "0")
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

type OverviewDailyRowRpc = {
  date_key: string
  total_orders: number
  completed_orders: number
  cancelled_orders: number
  in_progress_orders: number
  revenue_mad: number
  revenue_orders: number
}

async function fetchOverviewDailyRpc(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<OverviewDailyRowRpc[]> {
  const countRows = await runAnalyticsRpc<{ rows_count: number }>(
    supabase,
    "analytics_daily_orders_rows_count",
    {
      p_store_id: storeId,
      p_from: window.start_date_key,
      p_to: window.end_date_key_inclusive,
    }
  )
  const count = Number(countRows[0]?.rows_count ?? 0)

  const fn = count > 0
    ? "analytics_overview_daily_from_daily"
    : "analytics_overview_daily_agg"

  return runAnalyticsRpc<OverviewDailyRowRpc>(supabase, fn, {
    p_store_id: storeId,
    p_from: window.from_inclusive_iso,
    p_to: window.to_exclusive_iso,
    p_tz: "Africa/Casablanca",
  })
}

export async function fetchAnalyticsOverviewSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsOverviewSnapshot> {
  const daily = await fetchOverviewDailyRpc(supabase, storeId, window)
  const dailyStats = daily.map((r) => ({
    date: r.date_key,
    totalOrders: Number(r.total_orders),
    completedOrders: Number(r.completed_orders),
    cancelledOrders: Number(r.cancelled_orders),
    inProgressOrders: Number(r.in_progress_orders),
    completionRate: pct(Number(r.completed_orders), Number(r.total_orders)),
    cancellationRate: pct(Number(r.cancelled_orders), Number(r.total_orders)),
  }))

  const summary = dailyStats.reduce(
    (acc, r) => {
      acc.totalOrders += r.totalOrders
      acc.completedOrders += r.completedOrders
      acc.cancelledOrders += r.cancelledOrders
      acc.inProgressOrders += r.inProgressOrders
      return acc
    },
    {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      inProgressOrders: 0,
      completionRate: 0,
      cancellationRate: 0,
    }
  )
  summary.completionRate = pct(summary.completedOrders, summary.totalOrders)
  summary.cancellationRate = pct(summary.cancelledOrders, summary.totalOrders)

  return { window, dailyStats, summary }
}

export async function fetchAnalyticsRevenueSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsRevenueSnapshot> {
  const daily = await fetchOverviewDailyRpc(supabase, storeId, window)
  const dailySales: RevenueDataPoint[] = daily.map((r) => ({
    date: r.date_key,
    revenue: Number(r.revenue_mad),
    orders: Number(r.revenue_orders),
  }))

  return { window, dailySales, monthlyGrowth: null }
}

export async function fetchAnalyticsBreakdownSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsBreakdownSnapshot> {
  const daily = await fetchOverviewDailyRpc(supabase, storeId, window)
  let revenue = 0
  let paidOrders = 0
  let unpaidOrders = 0
  let orderCount = 0
  for (const d of daily) {
    revenue += Number(d.revenue_mad)
    paidOrders += Number(d.revenue_orders)
    orderCount += Number(d.total_orders)
    unpaidOrders += Number(d.total_orders) - Number(d.revenue_orders)
  }
  const bucket = {
    key: "Boutique",
    revenue,
    collectedRevenue: revenue,
    outstanding: 0,
    collectionRate: 100,
    orderCount,
    avgOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
    percentage: 100,
    paidOrders,
    partialOrders: 0,
    unpaidOrders,
  }
  return { window, byChannel: [bucket], byOrderType: [bucket] }
}

export async function fetchAnalyticsFulfillmentSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsFulfillmentSnapshot> {
  const rows = await runAnalyticsRpc<{
    total_orders: number
    cancelled_orders: number
    prep_seconds_avg: number
    delivery_seconds_avg: number
  }>(supabase, "analytics_fulfillment_agg", {
    p_store_id: storeId,
    p_from: window.from_inclusive_iso,
    p_to: window.to_exclusive_iso,
  })
  const row = (rows[0] ?? {
    total_orders: 0,
    cancelled_orders: 0,
    prep_seconds_avg: 0,
    delivery_seconds_avg: 0,
  })
  const totalOrders = Number(row.total_orders)
  const cancelled = Number(row.cancelled_orders)
  return {
    window,
    averagePreparationTime: secondsToHms(Number(row.prep_seconds_avg)),
    averageDeliveryTime: secondsToHms(Number(row.delivery_seconds_avg)),
    onTimeDeliveryRate: totalOrders > 0 ? 100 - pct(cancelled, totalOrders) : 0,
    lateOrders: 0,
    cancellationRate: pct(cancelled, totalOrders),
    totalOrders,
  }
}

export async function fetchAnalyticsCancellationSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsCancellationSnapshot> {
  const daily = await fetchOverviewDailyRpc(supabase, storeId, window)
  let totalOrders = 0
  let totalCancellations = 0
  let estimatedRevenueLost = 0
  for (const d of daily) {
    totalOrders += Number(d.total_orders)
    totalCancellations += Number(d.cancelled_orders)
  }
  const { data: cancelledOrders, error } = await supabase
    .from("orders")
    .select("total_mad")
    .eq("store_id", storeId)
    .eq("status", "cancelled")
    .gte("created_at", window.from_inclusive_iso)
    .lt("created_at", window.to_exclusive_iso)
  if (error) throw error
  for (const o of cancelledOrders ?? []) estimatedRevenueLost += Number(o.total_mad)

  return {
    window,
    totalCancellations,
    cancellationRate: pct(totalCancellations, totalOrders),
    estimatedRevenueLost,
    dailyCancellations: daily.map((d) => ({
      date: d.date_key,
      cancellations: Number(d.cancelled_orders),
      totalOrders: Number(d.total_orders),
      rate: pct(Number(d.cancelled_orders), Number(d.total_orders)),
    })),
  }
}

export async function fetchAnalyticsPeakHoursSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsPeakHoursSnapshot> {
  const rows = await runAnalyticsRpc<{ hour_of_day: number; orders: number; revenue_mad: number }>(
    supabase,
    "analytics_peak_hours_agg",
    {
      p_store_id: storeId,
      p_from: window.from_inclusive_iso,
      p_to: window.to_exclusive_iso,
      p_tz: "Africa/Casablanca",
    }
  )
  const peakHours = rows.slice(0, 6).map((r) => ({
    hour: Number(r.hour_of_day),
    orders: Number(r.orders),
    revenue: Number(r.revenue_mad),
  }))
  const daily = await fetchOverviewDailyRpc(supabase, storeId, window)
  const dailyPattern = Object.fromEntries(
    daily.map((d) => [
      d.date_key,
      {
        orders: Number(d.revenue_orders),
        revenue: Number(d.revenue_mad),
      },
    ])
  )
  const busiest = Object.entries(dailyPattern).sort((a, b) => b[1].orders - a[1].orders)[0]
  return {
    window,
    peakHours,
    busiestDay: busiest?.[0] ?? "",
    dailyPattern,
  }
}
