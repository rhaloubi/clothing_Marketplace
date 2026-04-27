import { withUserAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsWindowQuery } from "@/lib/server/analytics-query"
import { runAnalyticsRpc } from "@/lib/server/analytics-rpc"
import type { NextRequest } from "next/server"
import type { FunnelData } from "@/types"

export const GET = withUserAuth(
  withPlan("has_analytics")(
    withRateLimit("api", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
      let range: ReturnType<typeof parseAnalyticsWindowQuery>
      try {
        range = parseAnalyticsWindowQuery(req)
      } catch (e) {
        return fail(e)
      }

      const supabase = await createClient()
      await assertStoreOwnership(supabase, range.store_id, auth.user.id)

      const rows = await runAnalyticsRpc<{
        product_views: number
        cart_adds: number
        checkout_starts: number
        orders_placed: number
      }>(supabase, "analytics_funnel_agg", {
        p_store_id: range.store_id,
        p_from: range.window.from_inclusive_iso,
        p_to: range.window.to_exclusive_iso,
      })
      const row = (rows[0] ?? {
        product_views: 0,
        cart_adds: 0,
        checkout_starts: 0,
        orders_placed: 0,
      })
      const product_views = Number(row.product_views)
      const cart_adds = Number(row.cart_adds)
      const checkout_starts = Number(row.checkout_starts)
      const orders_placed = Number(row.orders_placed)

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

      return ok({ window: range.window, funnel })
    })
  )
)
