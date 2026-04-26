import type { NextRequest } from "next/server"
import { withUserAuth, withPlan, withRateLimit, ok, fail, ValidationError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { fetchAnalyticsRevenueCompareSnapshot } from "@/lib/server/analytics-compare"
import { analyticsCompareQuerySchema } from "@/lib/validations"

export const GET = withUserAuth(
  withPlan("has_analytics")(
    withRateLimit("api", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
      const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
      const parsed = analyticsCompareQuerySchema.safeParse(raw)
      if (!parsed.success) {
        const first = parsed.error.errors[0]
        return fail(
          new ValidationError(
            first?.message ?? "Paramètres invalides.",
            Object.fromEntries(
              parsed.error.errors.map((e) => [e.path.join("."), e.message])
            )
          )
        )
      }

      const { store_id, preset } = parsed.data
      const supabase = await createClient()
      await assertStoreOwnership(supabase, store_id, auth.user.id)

      try {
        const snapshot = await fetchAnalyticsRevenueCompareSnapshot(
          supabase,
          store_id,
          preset
        )
        return ok(snapshot)
      } catch (e) {
        return fail(e)
      }
    })
  )
)
