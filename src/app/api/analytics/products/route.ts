import { withAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsRangeQuery, orderCountsAsRevenue } from "@/lib/server/analytics-query"
import type { NextRequest } from "next/server"
import type { TopProduct } from "@/types"

export const GET = withRateLimit("api", { keyBy: "user" })(
  withAuth(
    withPlan("has_analytics")(async (req: NextRequest, { auth }) => {
      let range: ReturnType<typeof parseAnalyticsRangeQuery>
      try {
        range = parseAnalyticsRangeQuery(req)
      } catch (e) {
        return fail(e)
      }

      const supabase = await createClient()
      await assertStoreOwnership(supabase, range.store_id, auth.user.id)

      const { data: orderRows, error: oErr } = await supabase
        .from("orders")
        .select("id, status")
        .eq("store_id", range.store_id)
        .gte("created_at", range.from)
        .lte("created_at", range.to)

      if (oErr) return fail(oErr)

      const eligibleIds = new Set(
        (orderRows ?? []).filter((o) => orderCountsAsRevenue(o.status)).map((o) => o.id)
      )

      if (eligibleIds.size === 0) {
        return ok({ range: { from: range.from, to: range.to }, top_products: [] as TopProduct[] })
      }

      const { data: items, error: iErr } = await supabase
        .from("order_items")
        .select(
          "product_id, product_name, product_image, quantity, total_price_mad, order_id"
        )
        .in("order_id", [...eligibleIds])

      if (iErr) return fail(iErr)

      const agg = new Map<
        string,
        { product_name: string; product_image: string | null; units: number; revenue: number }
      >()

      for (const row of items ?? []) {
        if (!row.product_id) continue
        const cur = agg.get(row.product_id) ?? {
          product_name: row.product_name,
          product_image: row.product_image,
          units: 0,
          revenue: 0,
        }
        cur.units += row.quantity
        cur.revenue += row.total_price_mad
        agg.set(row.product_id, cur)
      }

      const top_products: TopProduct[] = [...agg.entries()]
        .map(([product_id, v]) => ({
          product_id,
          product_name: v.product_name,
          product_image: v.product_image,
          units_sold: v.units,
          revenue: v.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20)

      return ok({ range: { from: range.from, to: range.to }, top_products })
    })
  )
)
