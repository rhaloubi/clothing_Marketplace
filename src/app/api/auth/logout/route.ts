import { withUserAuth, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"

export const POST = withUserAuth(
  withRateLimit("auth", { keyBy: "user" })(async () => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) return fail(error)
    return ok({ logged_out: true })
  })
)
