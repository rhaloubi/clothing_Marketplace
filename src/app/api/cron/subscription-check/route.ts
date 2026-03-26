import { withWebhook, ok, fail } from "@/lib/api"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Marks subscriptions as `expired` when `current_period_end` is in the past.
 * Call from Vercel Cron with `Authorization: Bearer <CRON_SECRET>`.
 */
export const GET = withWebhook("cron")(async (_req, _ctx) => {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from("subscriptions")
    .update({ status: "expired", updated_at: now })
    .eq("status", "active")
    .lt("current_period_end", now)
    .select("id")

  if (error) return fail(error)
  return ok({ expired_count: data?.length ?? 0 })
})
