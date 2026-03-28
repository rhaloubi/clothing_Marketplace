import { type NextRequest } from "next/server"
import { withUserAuth, withRateLimit, ok, fail, NotFoundError, ValidationError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { patchProfileSchema } from "@/lib/validations"

export const GET = withUserAuth(
  withRateLimit("api", { keyBy: "user" })(async (_req, { auth }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .maybeSingle()

    if (error) return fail(error)
    if (!data) return fail(new NotFoundError("Profil"))

    return ok(data)
  })
)

export const PATCH = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
    const body = (await req.json()) as unknown
    const parsed = patchProfileSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    // Build the update payload — only include fields that were actually passed
    const patch: Record<string, unknown> = {}
    if (parsed.data.full_name !== undefined) patch.full_name = parsed.data.full_name
    if ("phone" in parsed.data) patch.phone = parsed.data.phone ?? null
    if ("avatar_url" in parsed.data) patch.avatar_url = parsed.data.avatar_url ?? null

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", auth.user.id)
      .select()
      .single()

    if (error) return fail(error)
    return ok(data)
  })
)
