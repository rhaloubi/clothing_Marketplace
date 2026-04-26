import type { NextRequest } from "next/server"
import { withUserAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsWindowQuery } from "@/lib/server/analytics-query"
import { fetchAnalyticsBreakdownSnapshot } from "@/lib/server/analytics-modules"

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
      const snapshot = await fetchAnalyticsBreakdownSnapshot(supabase, range.store_id, range.window)
      return ok(snapshot)
    })
  )
)
