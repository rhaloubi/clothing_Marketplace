import { withAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsRangeQuery, orderCountsAsRevenue } from "@/lib/server/analytics-query"
import type { NextRequest } from "next/server"

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

      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("wilaya_id, total_mad, status")
        .eq("store_id", range.store_id)
        .gte("created_at", range.from)
        .lte("created_at", range.to)

      if (oErr) return fail(oErr)

      const fromOrders = new Map<number, { orders: number; revenue_mad: number }>()
      for (const o of orders ?? []) {
        if (!orderCountsAsRevenue(o.status)) continue
        const cur = fromOrders.get(o.wilaya_id) ?? { orders: 0, revenue_mad: 0 }
        cur.orders += 1
        cur.revenue_mad += o.total_mad
        fromOrders.set(o.wilaya_id, cur)
      }

      const { data: events, error: eErr } = await supabase
        .from("analytics_events")
        .select("wilaya_id, event_type")
        .eq("store_id", range.store_id)
        .gte("created_at", range.from)
        .lte("created_at", range.to)
        .not("wilaya_id", "is", null)

      if (eErr) return fail(eErr)

      const eventByWilaya = new Map<number, Record<string, number>>()
      for (const ev of events ?? []) {
        if (ev.wilaya_id == null) continue
        const m = eventByWilaya.get(ev.wilaya_id) ?? {}
        m[ev.event_type] = (m[ev.event_type] ?? 0) + 1
        eventByWilaya.set(ev.wilaya_id, m)
      }

      const wilayaIds = new Set<number>([
        ...fromOrders.keys(),
        ...eventByWilaya.keys(),
      ])

      if (wilayaIds.size === 0) {
        return ok({ range: { from: range.from, to: range.to }, breakdown: [] })
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

      return ok({ range: { from: range.from, to: range.to }, breakdown })
    })
  )
)
