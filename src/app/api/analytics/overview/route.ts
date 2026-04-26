import { withUserAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsWindowQuery } from "@/lib/server/analytics-query"
import { fetchAnalyticsOverviewSnapshot } from "@/lib/server/analytics-modules"
import { withAnalyticsCache } from "@/lib/server/analytics-cache"
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
      const cacheKey = `overview:${range.store_id}:${range.window.preset}:${range.window.start_date_key}:${range.window.end_date_key_inclusive}`
      const snapshot = await withAnalyticsCache(cacheKey, async () =>
        fetchAnalyticsOverviewSnapshot(supabase, range.store_id, range.window)
      )
      return ok(snapshot)
    })
  )
)
