import { type NextRequest } from "next/server"
import { withRateLimit, ok, fail, ValidationError, UnauthorizedError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { loginSchema } from "@/lib/validations"

export const POST = withRateLimit("auth")(async (req: NextRequest) => {
  const body = (await req.json()) as unknown
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return fail(
      new ValidationError(
        parsed.error.errors[0]?.message ?? "Invalide",
        Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
      )
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return fail(new UnauthorizedError("Email ou mot de passe invalide."))
  }

  return ok({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: data.session ? { expires_at: data.session.expires_at } : null,
  })
})
