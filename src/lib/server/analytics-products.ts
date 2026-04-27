import type { SupabaseClient } from "@supabase/supabase-js"
import type { AnalyticsDateWindow, AnalyticsMenuSnapshot } from "@/types"
import type { Database } from "@/types/database.types"
import { runAnalyticsRpc } from "@/lib/server/analytics-rpc"
import { offsetCasablancaDateKey, previousCasablancaDateKey, startOfCasablancaDayUtc } from "@/lib/utils/morocco-time"

type SB = SupabaseClient<Database>

type ProductAggRow = {
  product_id: string
  product_name: string
  quantity_sold: number
  revenue_mad: number
  order_count: number
  revenue_share: number
  avg_revenue_per_order: number
}

function boundedRound(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0
}

function derivePreviousWindow(window: AnalyticsDateWindow): {
  fromIso: string
  toIso: string
  startKey: string
  endKey: string
} {
  const prevEnd = previousCasablancaDateKey(window.start_date_key)
  const prevStart = offsetCasablancaDateKey(prevEnd, -(window.day_count - 1))
  return {
    fromIso: startOfCasablancaDayUtc(prevStart).toISOString(),
    toIso: startOfCasablancaDayUtc(window.start_date_key).toISOString(),
    startKey: prevStart,
    endKey: prevEnd,
  }
}

function slotForHour(hour: number): "MORNING" | "LUNCH" | "AFTERNOON" | "EVENING" | "NIGHT" {
  if (hour >= 6 && hour < 11) return "MORNING"
  if (hour >= 11 && hour < 14) return "LUNCH"
  if (hour >= 14 && hour < 17) return "AFTERNOON"
  if (hour >= 17 && hour < 21) return "EVENING"
  return "NIGHT"
}

export async function fetchAnalyticsMenuSnapshot(
  supabase: SB,
  storeId: string,
  window: AnalyticsDateWindow
): Promise<AnalyticsMenuSnapshot> {
  const productRowsRaw = await runAnalyticsRpc<ProductAggRow>(supabase, "analytics_products_agg", {
    p_store_id: storeId,
    p_from: window.from_inclusive_iso,
    p_to: window.to_exclusive_iso,
  })
  const productRows = productRowsRaw
  const totalRevenue = productRows.reduce((sum, r) => sum + Number(r.revenue_mad), 0)
  const totalUniqueItems = productRows.length

  const revenueItems = productRows.map((r) => ({
    productId: r.product_id,
    name: r.product_name,
    quantitySold: Number(r.quantity_sold),
    revenue: Number(r.revenue_mad),
    orderCount: Number(r.order_count),
    revenueShare: boundedRound(Number(r.revenue_share)),
    avgRevenuePerOrder: Number(r.avg_revenue_per_order),
  }))

  const topItems = revenueItems.slice(0, 10).map((r) => ({
    productId: r.productId,
    name: r.name,
    quantitySold: r.quantitySold,
    revenue: r.revenue,
    orderCount: r.orderCount,
  }))

  const underperformingItems = [...revenueItems]
    .sort((a, b) => a.revenueShare - b.revenueShare)
    .slice(0, 10)
    .map((r) => ({
      productId: r.productId,
      name: r.name,
      quantitySold: r.quantitySold,
      revenue: r.revenue,
      orderCount: r.orderCount,
      revenueShare: r.revenueShare,
    }))

  const pairRowsRaw = await runAnalyticsRpc<{
    product_id_a: string
    name_a: string
    product_id_b: string
    name_b: string
    co_occurrence_count: number
    support_percent: number
    total_orders_analyzed: number
  }>(supabase, "analytics_product_pairs_agg", {
    p_store_id: storeId,
    p_from: window.from_inclusive_iso,
    p_to: window.to_exclusive_iso,
  })
  const pairRows = pairRowsRaw
  const frequentPairs = pairRows.slice(0, 10).map((r) => ({
    productIdA: r.product_id_a,
    nameA: r.name_a,
    productIdB: r.product_id_b,
    nameB: r.name_b,
    coOccurrenceCount: Number(r.co_occurrence_count),
    supportPercent: boundedRound(Number(r.support_percent)),
  }))
  const totalOrdersAnalyzed = Number(pairRows[0]?.total_orders_analyzed ?? 0)

  const byTimeRaw = await runAnalyticsRpc<{
    slot: string
    product_id: string
    product_name: string
    quantity_sold: number
    revenue_mad: number
    slot_total_items: number
    slot_total_revenue: number
  }>(supabase, "analytics_product_timeslot_agg", {
    p_store_id: storeId,
    p_from: window.from_inclusive_iso,
    p_to: window.to_exclusive_iso,
    p_tz: "Africa/Casablanca",
  })
  const byTimeRows = byTimeRaw

  const slotMeta = [
    { slot: "MORNING", startHour: 6, endHour: 11 },
    { slot: "LUNCH", startHour: 11, endHour: 14 },
    { slot: "AFTERNOON", startHour: 14, endHour: 17 },
    { slot: "EVENING", startHour: 17, endHour: 21 },
    { slot: "NIGHT", startHour: 21, endHour: 6 },
  ] as const

  const topItemsBySlot: Record<string, Array<{ productId: string; name: string; quantitySold: number; revenue: number }>> = {
    MORNING: [],
    LUNCH: [],
    AFTERNOON: [],
    EVENING: [],
    NIGHT: [],
  }
  const slotTotals = new Map<string, { totalItemsSold: number; totalRevenue: number }>()
  for (const row of byTimeRows) {
    const slot = row.slot || slotForHour(0)
    topItemsBySlot[slot] ??= []
    topItemsBySlot[slot].push({
      productId: row.product_id,
      name: row.product_name,
      quantitySold: Number(row.quantity_sold),
      revenue: Number(row.revenue_mad),
    })
    if (!slotTotals.has(slot)) {
      slotTotals.set(slot, {
        totalItemsSold: Number(row.slot_total_items),
        totalRevenue: Number(row.slot_total_revenue),
      })
    }
  }
  for (const key of Object.keys(topItemsBySlot)) {
    topItemsBySlot[key] = topItemsBySlot[key]!.slice(0, 5)
  }

  const previous = derivePreviousWindow(window)
  const trendRowsRaw = await runAnalyticsRpc<{
    product_id: string
    product_name: string
    current_quantity: number
    current_revenue: number
    previous_quantity: number
    previous_revenue: number
    quantity_change_percent: number | null
    revenue_change_percent: number | null
  }>(supabase, "analytics_product_trends_agg", {
    p_store_id: storeId,
    p_current_from: window.from_inclusive_iso,
    p_current_to: window.to_exclusive_iso,
    p_previous_from: previous.fromIso,
    p_previous_to: previous.toIso,
  })
  const trendRows = trendRowsRaw
  const trends = trendRows.map((r) => ({
    productId: r.product_id,
    name: r.product_name,
    currentQuantity: Number(r.current_quantity),
    currentRevenue: Number(r.current_revenue),
    previousQuantity: Number(r.previous_quantity),
    previousRevenue: Number(r.previous_revenue),
    quantityChangePercent:
      r.quantity_change_percent == null ? null : boundedRound(Number(r.quantity_change_percent)),
    revenueChangePercent:
      r.revenue_change_percent == null ? null : boundedRound(Number(r.revenue_change_percent)),
  }))
  const risers = [...trends]
    .filter((t) => (t.revenueChangePercent ?? 0) > 0)
    .sort((a, b) => (b.revenueChangePercent ?? 0) - (a.revenueChangePercent ?? 0))
    .slice(0, 10)
  const fallers = [...trends]
    .filter((t) => (t.revenueChangePercent ?? 0) < 0)
    .sort((a, b) => (a.revenueChangePercent ?? 0) - (b.revenueChangePercent ?? 0))
    .slice(0, 10)

  return {
    window,
    popular: { topItems },
    underperforming: {
      startDate: window.start_date_key,
      endDate: window.end_date_key_inclusive,
      underperformingItems,
      totalUniqueItems,
    },
    revenue: {
      startDate: window.start_date_key,
      endDate: window.end_date_key_inclusive,
      items: revenueItems,
      totalRevenue,
      totalUniqueItems,
    },
    affinity: {
      startDate: window.start_date_key,
      endDate: window.end_date_key_inclusive,
      frequentPairs,
      totalOrdersAnalyzed,
    },
    byTime: {
      startDate: window.start_date_key,
      endDate: window.end_date_key_inclusive,
      timeSlots: slotMeta.map((s) => ({
        slot: s.slot,
        startHour: s.startHour,
        endHour: s.endHour,
        totalItemsSold: slotTotals.get(s.slot)?.totalItemsSold ?? 0,
        totalRevenue: slotTotals.get(s.slot)?.totalRevenue ?? 0,
      })),
      topItemsBySlot,
    },
    trends: {
      currentStart: window.start_date_key,
      currentEnd: window.end_date_key_inclusive,
      previousStart: previous.startKey,
      previousEnd: previous.endKey,
      trends,
      risers,
      fallers,
    },
  }
}
