import { withWebhook, ok, fail, ValidationError } from "@/lib/api"
import { createAdminClient } from "@/lib/supabase/admin"

type BatchRow = { processed: number; failed: number }
type ValidationRow = {
  source: string
  total_orders: number
  revenue_mad: number
  cancelled_orders: number
}

export const GET = withWebhook("cron")(async (req, _ctx) => {
  const admin = createAdminClient()
  const rpc = admin.rpc.bind(admin) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: unknown }>
  const action = req.nextUrl.searchParams.get("action") ?? "process"

  try {
    if (action === "backfill") {
      const storeId = req.nextUrl.searchParams.get("store_id")
      const from = req.nextUrl.searchParams.get("from")
      const to = req.nextUrl.searchParams.get("to")
      if (!storeId || !from || !to) {
        return fail(new ValidationError("Paramètres manquants.", {
          store_id: "Requis",
          from: "Requis (YYYY-MM-DD)",
          to: "Requis (YYYY-MM-DD)",
        }))
      }
      const { error } = await rpc("analytics_backfill_range", {
        p_store_id: storeId,
        p_from: from,
        p_to: to,
      })
      if (error) return fail(error)
      return ok({ done: true, action, store_id: storeId, from, to })
    }

    if (action === "validate") {
      const storeId = req.nextUrl.searchParams.get("store_id")
      const dateKey = req.nextUrl.searchParams.get("date_key")
      if (!storeId || !dateKey) {
        return fail(new ValidationError("Paramètres manquants.", {
          store_id: "Requis",
          date_key: "Requis (YYYY-MM-DD)",
        }))
      }
      const { data, error } = await rpc("analytics_aggregate_validation", {
        p_store_id: storeId,
        p_date_key: dateKey,
      })
      if (error) return fail(error)
      return ok({ rows: (data ?? []) as ValidationRow[] })
    }

    const { data, error } = await rpc("analytics_process_jobs_batch", {
      p_limit: 300,
    })
    if (error) return fail(error)
    const row = ((data as BatchRow[] | null) ?? [])[0] ?? { processed: 0, failed: 0 }
    return ok({ action: "process", processed: row.processed, failed: row.failed })
  } catch (e) {
    return fail(e)
  }
})
