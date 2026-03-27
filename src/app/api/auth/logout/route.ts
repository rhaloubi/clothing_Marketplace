import { withAuth, withRateLimit, ok, fail } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"

export const POST = withRateLimit("auth", { keyBy: "user" })(
  withAuth(async () => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) return fail(error)
    return ok({ logged_out: true })
  })
)
