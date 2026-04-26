import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import type { OrderStatus } from "@/types"
import { orderCountsAsRevenue } from "@/lib/server/analytics-query"
import { fetchDashboardProductList } from "@/lib/server/products-dashboard-list"
import {
  getCasablancaDayBoundsUtc,
  previousCasablancaDateKey,
  startOfCasablancaDayUtc,
  endExclusiveOfCasablancaDayUtc,
} from "@/lib/utils/morocco-time"

type SB = SupabaseClient<Database>

type OrderRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "status" | "total_mad" | "order_number" | "customer_name" | "created_at"
>

export type DashboardRecentOrder = {
  id: string
  order_number: string
  status: OrderStatus
  customer_name: string
  total_mad: number
  created_at: string
}

export type DashboardTodayTraffic = {
  page_views: number
  cart_adds: number
  checkout_starts: number
}

export type DashboardTodaySnapshot = {
  dateKey: string
  /** Long French label for header (Casablanca calendar day). */
  dateLabelFr: string
  kpis: {
    revenueMad: number
    ordersCount: number
    avgOrderMad: number
    /** Share of today's orders already delivered (0–100). */
    deliveredRatePct: number
    pendingCount: number
    pendingMad: number
    cancelledCount: number
    /** vs yesterday (same metrics); null if yesterday had no comparable data. */
    vsYesterday: {
      revenueDeltaPct: number | null
      ordersDelta: number | null
    }
  }
  statusCountsToday: Record<OrderStatus, number>
  recentOrders: DashboardRecentOrder[]
  traffic: DashboardTodayTraffic
  lowStockProductCount: number
}

function aggregateDayOrders(rows: OrderRow[]): {
  revenueMad: number
  ordersCount: number
  avgOrderMad: number
  deliveredRatePct: number
  pendingCount: number
  pendingMad: number
  cancelledCount: number
  statusCounts: Record<OrderStatus, number>
} {
  const statusCounts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    returned: 0,
    cancelled: 0,
  }
  let revenueMad = 0
  let revenueOrderCount = 0
  let pendingCount = 0
  let pendingMad = 0
  let cancelledCount = 0
  let deliveredCount = 0

  for (const r of rows) {
    const s = r.status as OrderStatus
    if (statusCounts[s] !== undefined) statusCounts[s] += 1
    if (orderCountsAsRevenue(s)) {
      revenueMad += r.total_mad
      revenueOrderCount += 1
    }
    if (s === "pending") {
      pendingCount += 1
      pendingMad += r.total_mad
    }
    if (s === "cancelled") cancelledCount += 1
    if (s === "delivered") deliveredCount += 1
  }

  const ordersCount = rows.length
  const avgOrderMad =
    revenueOrderCount > 0 ? Math.round(revenueMad / revenueOrderCount) : 0
  const deliveredRatePct =
    ordersCount > 0 ? Math.round((100 * deliveredCount) / ordersCount) : 0

  return {
    revenueMad,
    ordersCount,
    avgOrderMad,
    deliveredRatePct,
    pendingCount,
    pendingMad,
    cancelledCount,
    statusCounts,
  }
}

async function fetchOrdersInRange(
  supabase: SB,
  storeId: string,
  startIso: string,
  endExclusiveIso: string
): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, total_mad, order_number, customer_name, created_at")
    .eq("store_id", storeId)
    .gte("created_at", startIso)
    .lt("created_at", endExclusiveIso)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as OrderRow[]
}

async function countEvent(
  supabase: SB,
  storeId: string,
  eventType: string,
  startIso: string,
  endExclusiveIso: string
): Promise<number> {
  const { count, error } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("event_type", eventType)
    .gte("created_at", startIso)
    .lt("created_at", endExclusiveIso)

  if (error) return 0
  return count ?? 0
}

export async function fetchDashboardHomeSnapshot(
  supabase: SB,
  storeId: string
): Promise<DashboardTodaySnapshot> {
  const { dateKey, startUtc, endExclusiveUtc } = getCasablancaDayBoundsUtc()
  const startIso = startUtc.toISOString()
  const endIso = endExclusiveUtc.toISOString()

  const yesterdayKey = previousCasablancaDateKey(dateKey)
  const yStart = startOfCasablancaDayUtc(yesterdayKey)
  const yEnd = endExclusiveOfCasablancaDayUtc(yesterdayKey)
  const yStartIso = yStart.toISOString()
  const yEndIso = yEnd.toISOString()

  const dateLabelFr = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Casablanca",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(startUtc)

  const [
    todayRows,
    yesterdayRows,
    recentRes,
    lowStockRes,
    pageViews,
    cartAdds,
    checkoutStarts,
  ] = await Promise.all([
    fetchOrdersInRange(supabase, storeId, startIso, endIso),
    fetchOrdersInRange(supabase, storeId, yStartIso, yEndIso),
    supabase
      .from("orders")
      .select("id, order_number, status, customer_name, total_mad, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(8),
    fetchDashboardProductList(
      supabase,
      storeId,
      { query: "", category: "", status: "all", stock: "low" },
      1,
      1
    ).catch(() => ({ total: 0, rows: [], maxStockOnPage: 1 })),
    countEvent(supabase, storeId, "page_view", startIso, endIso),
    countEvent(supabase, storeId, "cart_add", startIso, endIso),
    countEvent(supabase, storeId, "checkout_start", startIso, endIso),
  ])

  const todayAgg = aggregateDayOrders(todayRows)
  const yesterdayAgg = aggregateDayOrders(yesterdayRows)

  let revenueDeltaPct: number | null = null
  if (yesterdayAgg.revenueMad > 0) {
    revenueDeltaPct = Math.round(
      ((todayAgg.revenueMad - yesterdayAgg.revenueMad) / yesterdayAgg.revenueMad) * 100
    )
  } else if (todayAgg.revenueMad > 0 && yesterdayAgg.revenueMad === 0) {
    revenueDeltaPct = null
  }

  const ordersDelta =
    todayAgg.ordersCount !== yesterdayAgg.ordersCount
      ? todayAgg.ordersCount - yesterdayAgg.ordersCount
      : null

  const recentOrders: DashboardRecentOrder[] = (recentRes.error
    ? []
    : (recentRes.data ?? [])
  ).map((r) => ({
    id: r.id,
    order_number: r.order_number,
    status: r.status as OrderStatus,
    customer_name: r.customer_name,
    total_mad: r.total_mad,
    created_at: r.created_at,
  }))

  return {
    dateKey,
    dateLabelFr,
    kpis: {
      revenueMad: todayAgg.revenueMad,
      ordersCount: todayAgg.ordersCount,
      avgOrderMad: todayAgg.avgOrderMad,
      deliveredRatePct: todayAgg.deliveredRatePct,
      pendingCount: todayAgg.pendingCount,
      pendingMad: todayAgg.pendingMad,
      cancelledCount: todayAgg.cancelledCount,
      vsYesterday: {
        revenueDeltaPct,
        ordersDelta: ordersDelta === 0 ? null : ordersDelta,
      },
    },
    statusCountsToday: todayAgg.statusCounts,
    recentOrders,
    traffic: {
      page_views: pageViews,
      cart_adds: cartAdds,
      checkout_starts: checkoutStarts,
    },
    lowStockProductCount: lowStockRes.total,
  }
}
