import { withAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsRangeQuery } from "@/lib/server/analytics-query"
import type { NextRequest } from "next/server"
import type { FunnelData } from "@/types"

export const GET = withAuth(
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

      const { data: events, error } = await supabase
        .from("analytics_events")
        .select("event_type")
        .eq("store_id", range.store_id)
        .gte("created_at", range.from)
        .lte("created_at", range.to)

      if (error) return fail(error)

      let product_views = 0
      let cart_adds = 0
      let checkout_starts = 0
      let orders_placed = 0

      for (const e of events ?? []) {
        switch (e.event_type) {
          case "product_view":
            product_views += 1
            break
          case "cart_add":
            cart_adds += 1
            break
          case "checkout_start":
            checkout_starts += 1
            break
          case "order_placed":
            orders_placed += 1
            break
          default:
            break
        }
      }

      const funnel: FunnelData = {
        product_views,
        cart_adds,
        checkout_starts,
        orders_placed,
        cart_conversion_rate:
          product_views > 0 ? Math.round((cart_adds / product_views) * 10000) / 100 : 0,
        checkout_conversion_rate:
          checkout_starts > 0
            ? Math.round((orders_placed / checkout_starts) * 10000) / 100
            : 0,
      }

      return ok({ range: { from: range.from, to: range.to }, funnel })
    })
  )
)
