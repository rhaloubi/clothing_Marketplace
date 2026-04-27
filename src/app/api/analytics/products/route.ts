import { withUserAuth, withPlan, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { parseAnalyticsWindowQuery } from "@/lib/server/analytics-query"
import { fetchAnalyticsMenuSnapshot } from "@/lib/server/analytics-products"
import type { NextRequest } from "next/server"
import { withAnalyticsCache } from "@/lib/server/analytics-cache"

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
      try {
        const cacheKey = `menu:${range.store_id}:${range.window.preset}:${range.window.start_date_key}:${range.window.end_date_key_inclusive}`
        const snapshot = await withAnalyticsCache(cacheKey, async () =>
          fetchAnalyticsMenuSnapshot(supabase, range.store_id, range.window)
        )
        return ok(snapshot)
      } catch (e) {
        return fail(e)
      }
    })
  )
)
