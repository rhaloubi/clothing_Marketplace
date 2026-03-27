import { type NextRequest } from "next/server"
import {
  withRateLimit,
  ok,
  fail,
  ValidationError,
  ConflictError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { signupSchema } from "@/lib/validations"

export const POST = withRateLimit("auth")(async (req: NextRequest) => {
  const body = (await req.json()) as unknown
  const parsed = signupSchema.safeParse(body)

  if (!parsed.success) {
    return fail(
      new ValidationError(
        parsed.error.errors[0]?.message ?? "Invalide",
        Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
      )
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
      },
    },
  })

  if (error) {
    if (
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered")
    ) {
      return fail(new ConflictError("Un compte existe déjà avec cet email."))
    }
    return fail(error)
  }

  return ok(
    {
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
          }
        : null,
      session: data.session ? { expires_at: data.session.expires_at } : null,
      message:
        "Compte créé. Vérifiez votre email si la confirmation est activée, sinon vous êtes connecté.",
    },
    201
  )
})
