import { withRateLimit, fail, ok } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"

/**
 * Public list of Moroccan regions (reference data). Cached at the edge/browser.
 */
export const GET = withRateLimit("public")(async (_req: Request, _ctx: { params: Promise<Record<string, string>> }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.from("wilayas").select("*").order("id", { ascending: true })

  if (error) return fail(error)

  const res = ok(data ?? [])
  res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
  return res
})
