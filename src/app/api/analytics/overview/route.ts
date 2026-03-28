import { withUserAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsRangeQuery, orderCountsAsRevenue } from "@/lib/server/analytics-query"
import type { NextRequest } from "next/server"

export const GET = withUserAuth(
  withPlan("has_analytics")(
    withRateLimit("api", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
      let range: ReturnType<typeof parseAnalyticsRangeQuery>
      try {
        range = parseAnalyticsRangeQuery(req)
      } catch (e) {
        return fail(e)
      }

      const supabase = await createClient()
      await assertStoreOwnership(supabase, range.store_id, auth.user.id)

      const { data: events, error: evErr } = await supabase
        .from("analytics_events")
        .select("event_type")
        .eq("store_id", range.store_id)
        .gte("created_at", range.from)
        .lte("created_at", range.to)

      if (evErr) return fail(evErr)

      const byType: Record<string, number> = {}
      for (const row of events ?? []) {
        byType[row.event_type] = (byType[row.event_type] ?? 0) + 1
      }

      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("status, total_mad")
        .eq("store_id", range.store_id)
        .gte("created_at", range.from)
        .lte("created_at", range.to)

      if (oErr) return fail(oErr)

      const orderList = orders ?? []
      const revenueOrders = orderList.filter((o) => orderCountsAsRevenue(o.status))
      const revenue_mad = revenueOrders.reduce((s, o) => s + o.total_mad, 0)

      return ok({
        range: { from: range.from, to: range.to },
        events_by_type: byType,
        orders_total: orderList.length,
        revenue_mad,
      })
    })
  )
)
