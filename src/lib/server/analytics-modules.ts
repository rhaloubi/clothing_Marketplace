import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  AnalyticsBreakdownSnapshot,
  AnalyticsCancellationSnapshot,
  AnalyticsDateWindow,
  AnalyticsFulfillmentSnapshot,
  AnalyticsOverviewDailyRow,
  AnalyticsOverviewSnapshot,
  AnalyticsPeakHoursSnapshot,
  AnalyticsRevenueSnapshot,
  RevenueDataPoint,
} from "@/types"
import type { Database } from "@/types/database.types"
import { orderCountsAsRevenue } from "@/lib/server/analytics-query"
import { enumerateCasablancaDateKeysInclusive, getCasablancaDateKey } from "@/lib/utils/morocco-time"

type SB = SupabaseClient<Database>

type OrderRow = {
  created_at: string
  status: string
  total_mad: number
  confirmed_at: string | null
  delivered_at: string | null
}

async function fetchOrders(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("created_at, status, total_mad, confirmed_at, delivered_at")
    .eq("store_id", storeId)
    .gte("created_at", window.from_inclusive_iso)
    .lt("created_at", window.to_exclusive_iso)

  if (error) throw error
  return (data ?? []) as OrderRow[]
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 10000) / 100
}

export async function fetchAnalyticsOverviewSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsOverviewSnapshot> {
  const orders = await fetchOrders(supabase, storeId, window)
  const keys = enumerateCasablancaDateKeysInclusive(
    window.start_date_key,
    window.end_date_key_inclusive
  )

  const dailyMap = new Map<string, AnalyticsOverviewDailyRow>()
  for (const k of keys) {
    dailyMap.set(k, {
      date: k,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      inProgressOrders: 0,
      completionRate: 0,
      cancellationRate: 0,
    })
  }

  for (const o of orders) {
    const day = getCasablancaDateKey(new Date(o.created_at))
    const row = dailyMap.get(day)
    if (!row) continue
    row.totalOrders += 1
    if (o.status === "delivered") row.completedOrders += 1
    else if (o.status === "cancelled") row.cancelledOrders += 1
    else row.inProgressOrders += 1
  }

  const dailyStats = keys.map((k) => {
    const r = dailyMap.get(k)!
    return {
      ...r,
      completionRate: pct(r.completedOrders, r.totalOrders),
      cancellationRate: pct(r.cancelledOrders, r.totalOrders),
    }
  })

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
  const orders = await fetchOrders(supabase, storeId, window)
  const keys = enumerateCasablancaDateKeysInclusive(
    window.start_date_key,
    window.end_date_key_inclusive
  )
  const byDay = new Map<string, { revenue: number; orders: number }>()
  for (const k of keys) byDay.set(k, { revenue: 0, orders: 0 })

  for (const o of orders) {
    if (!orderCountsAsRevenue(o.status)) continue
    const day = getCasablancaDateKey(new Date(o.created_at))
    const cur = byDay.get(day)
    if (!cur) continue
    cur.revenue += o.total_mad
    cur.orders += 1
  }

  const dailySales: RevenueDataPoint[] = keys.map((date) => {
    const v = byDay.get(date) ?? { revenue: 0, orders: 0 }
    return { date, revenue: v.revenue, orders: v.orders }
  })

  return { window, dailySales, monthlyGrowth: null }
}

export async function fetchAnalyticsBreakdownSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsBreakdownSnapshot> {
  const orders = await fetchOrders(supabase, storeId, window)
  let revenue = 0
  let paidOrders = 0
  let unpaidOrders = 0
  for (const o of orders) {
    revenue += o.total_mad
    if (orderCountsAsRevenue(o.status)) paidOrders += 1
    else unpaidOrders += 1
  }
  const orderCount = orders.length
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

function msToHms(ms: number): string {
  if (ms <= 0) return "00:00:00"
  const totalSec = Math.floor(ms / 1000)
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0")
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0")
  const ss = String(totalSec % 60).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

export async function fetchAnalyticsFulfillmentSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsFulfillmentSnapshot> {
  const orders = await fetchOrders(supabase, storeId, window)
  let prepMs = 0
  let prepCount = 0
  let deliveryMs = 0
  let deliveryCount = 0
  let cancelled = 0
  for (const o of orders) {
    if (o.status === "cancelled") cancelled += 1
    if (o.confirmed_at) {
      prepMs += new Date(o.confirmed_at).getTime() - new Date(o.created_at).getTime()
      prepCount += 1
    }
    if (o.delivered_at) {
      deliveryMs += new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime()
      deliveryCount += 1
    }
  }
  const averagePreparationTime = msToHms(prepCount > 0 ? prepMs / prepCount : 0)
  const averageDeliveryTime = msToHms(deliveryCount > 0 ? deliveryMs / deliveryCount : 0)
  return {
    window,
    averagePreparationTime,
    averageDeliveryTime,
    onTimeDeliveryRate: deliveryCount > 0 ? 100 : 0,
    lateOrders: 0,
    cancellationRate: pct(cancelled, orders.length),
    totalOrders: orders.length,
  }
}

export async function fetchAnalyticsCancellationSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsCancellationSnapshot> {
  const orders = await fetchOrders(supabase, storeId, window)
  const keys = enumerateCasablancaDateKeysInclusive(
    window.start_date_key,
    window.end_date_key_inclusive
  )
  const day = new Map<string, { cancellations: number; total: number }>()
  for (const k of keys) day.set(k, { cancellations: 0, total: 0 })

  let estimatedRevenueLost = 0
  for (const o of orders) {
    const key = getCasablancaDateKey(new Date(o.created_at))
    const cur = day.get(key)
    if (!cur) continue
    cur.total += 1
    if (o.status === "cancelled") {
      cur.cancellations += 1
      estimatedRevenueLost += o.total_mad
    }
  }
  const totalCancellations = orders.filter((o) => o.status === "cancelled").length
  return {
    window,
    totalCancellations,
    cancellationRate: pct(totalCancellations, orders.length),
    estimatedRevenueLost,
    dailyCancellations: keys.map((k) => {
      const v = day.get(k) ?? { cancellations: 0, total: 0 }
      return {
        date: k,
        cancellations: v.cancellations,
        totalOrders: v.total,
        rate: pct(v.cancellations, v.total),
      }
    }),
  }
}

export async function fetchAnalyticsPeakHoursSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsPeakHoursSnapshot> {
  const orders = await fetchOrders(supabase, storeId, window)
  const byHour = new Map<number, { orders: number; revenue: number }>()
  const byDay = new Map<string, { orders: number; revenue: number }>()
  for (const o of orders) {
    if (!orderCountsAsRevenue(o.status)) continue
    const d = new Date(o.created_at)
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Casablanca",
        hour: "2-digit",
        hour12: false,
      }).format(d)
    )
    const day = getCasablancaDateKey(d)
    const h = byHour.get(hour) ?? { orders: 0, revenue: 0 }
    h.orders += 1
    h.revenue += o.total_mad
    byHour.set(hour, h)
    const dy = byDay.get(day) ?? { orders: 0, revenue: 0 }
    dy.orders += 1
    dy.revenue += o.total_mad
    byDay.set(day, dy)
  }
  const peakHours = [...byHour.entries()]
    .map(([hour, v]) => ({ hour, orders: v.orders, revenue: v.revenue }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 6)
  const busiest = [...byDay.entries()].sort((a, b) => b[1].orders - a[1].orders)[0]
  return {
    window,
    peakHours,
    busiestDay: busiest?.[0] ?? "",
    dailyPattern: Object.fromEntries(byDay),
  }
}
