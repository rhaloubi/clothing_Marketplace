import { withUserAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsRangeQuery, orderCountsAsRevenue } from "@/lib/server/analytics-query"
import type { NextRequest } from "next/server"
import type { RevenueDataPoint } from "@/types"

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

      const { data: orders, error } = await supabase
        .from("orders")
        .select("created_at, total_mad, status")
        .eq("store_id", range.store_id)
        .gte("created_at", range.from)
        .lte("created_at", range.to)
        .order("created_at", { ascending: true })

      if (error) return fail(error)

      const byDay = new Map<string, { revenue: number; orders: number }>()

      for (const o of orders ?? []) {
        if (!orderCountsAsRevenue(o.status)) continue
        const day = o.created_at.slice(0, 10)
        const cur = byDay.get(day) ?? { revenue: 0, orders: 0 }
        cur.revenue += o.total_mad
        cur.orders += 1
        byDay.set(day, cur)
      }

      const series: RevenueDataPoint[] = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          revenue: v.revenue,
          orders: v.orders,
        }))

      return ok({ range: { from: range.from, to: range.to }, series })
    })
  )
)
