import { type NextRequest } from "next/server"
import {
  withUserAuth,
  withRateLimit,
  ok,
  fail,
  NotFoundError,
  ValidationError,
  invalidatePlanCache,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { updateSubscriptionPlanSchema } from "@/lib/validations"
import { assertDowngradeSafe, isDowngrade } from "@/lib/server/subscription-plan"

export const GET = withUserAuth(
  withRateLimit("api", { keyBy: "user" })(async (_req, { auth }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("user_id", auth.user.id)
      .maybeSingle()

    if (error) return fail(error)
    if (!data) return fail(new NotFoundError("Abonnement"))

    return ok(data)
  })
)

export const PATCH = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
    const body = (await req.json()) as unknown
    const parsed = updateSubscriptionPlanSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()

    // Load target plan
    const { data: targetPlan, error: planErr } = await supabase
      .from("plans")
      .select("*")
      .eq("name", parsed.data.plan_name)
      .maybeSingle()

    if (planErr) return fail(planErr)
    if (!targetPlan) return fail(new NotFoundError("Plan"))

    // Load current subscription (RLS select allowed)
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("user_id", auth.user.id)
      .maybeSingle()

    if (subErr) return fail(subErr)
    if (!sub) return fail(new NotFoundError("Abonnement"))

    const currentPlan = sub.plans as { name: string } | null
    const currentPlanName = currentPlan?.name ?? ""

    // Idempotent: already on the requested plan
    if (currentPlanName === parsed.data.plan_name) {
      return ok(sub)
    }

    // Downgrade guard — check store + active product counts fit within the target plan
    if (isDowngrade(currentPlanName, parsed.data.plan_name)) {
      await assertDowngradeSafe(supabase, auth.user.id, {
        max_stores: targetPlan.max_stores,
        max_products: targetPlan.max_products ?? null,
      })
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + 30)

    // Plan change requires admin client — subscriptions has no UPDATE RLS policy for merchants.
    // Billing stub: always reset to a fresh 30-day active period.
    // TODO: replace period logic with CMI payment confirmation when payment is implemented;
    // for upgrades consider keeping the remaining days of the current period instead of resetting.
    const admin = createAdminClient()
    const { data: updated, error: updateErr } = await admin
      .from("subscriptions")
      .update({
        plan_id: targetPlan.id,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", auth.user.id)
      .select("*, plans(*)")
      .single()

    if (updateErr) return fail(updateErr)

    // Invalidate the Redis plan cache so the next gated route loads the new plan immediately
    await invalidatePlanCache(auth.user.id)

    return ok(updated)
  })
)
