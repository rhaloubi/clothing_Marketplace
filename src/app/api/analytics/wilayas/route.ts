import { withUserAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsWindowQuery } from "@/lib/server/analytics-query"
import { runAnalyticsRpc } from "@/lib/server/analytics-rpc"
import type { NextRequest } from "next/server"

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

      const orderAgg = await runAnalyticsRpc<{ wilaya_id: number; orders: number; revenue_mad: number }>(
        supabase,
        "analytics_wilayas_order_agg",
        {
        p_store_id: range.store_id,
        p_from: range.window.from_inclusive_iso,
        p_to: range.window.to_exclusive_iso,
        }
      )
      const fromOrders = new Map<number, { orders: number; revenue_mad: number }>()
      for (const o of orderAgg) {
        fromOrders.set(Number(o.wilaya_id), {
          orders: Number(o.orders),
          revenue_mad: Number(o.revenue_mad),
        })
      }

      const eventAgg = await runAnalyticsRpc<{ wilaya_id: number; event_type: string; events: number }>(
        supabase,
        "analytics_wilayas_event_agg",
        {
        p_store_id: range.store_id,
        p_from: range.window.from_inclusive_iso,
        p_to: range.window.to_exclusive_iso,
        }
      )
      const eventByWilaya = new Map<number, Record<string, number>>()
      for (const ev of eventAgg) {
        const w = Number(ev.wilaya_id)
        const m = eventByWilaya.get(w) ?? {}
        m[String(ev.event_type)] = Number(ev.events)
        eventByWilaya.set(w, m)
      }

      const wilayaIds = new Set<number>([
        ...fromOrders.keys(),
        ...eventByWilaya.keys(),
      ])

      if (wilayaIds.size === 0) {
        return ok({ window: range.window, breakdown: [] })
      }

      const { data: wilayaRows } = await supabase
        .from("wilayas")
        .select("id, name_fr, code")
        .in("id", [...wilayaIds])

      const nameById = new Map((wilayaRows ?? []).map((w) => [w.id, w]))

      const breakdown = [...wilayaIds].sort((a, b) => a - b).map((id) => ({
        wilaya_id: id,
        wilaya: nameById.get(id) ?? null,
        orders: fromOrders.get(id)?.orders ?? 0,
        revenue_mad: fromOrders.get(id)?.revenue_mad ?? 0,
        events: eventByWilaya.get(id) ?? {},
      }))

      return ok({ window: range.window, breakdown })
    })
  )
)
