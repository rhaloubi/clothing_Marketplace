import { type NextRequest } from "next/server"
import {
  withUserAuth,
  withRateLimit,
  withPlan,
  assertStoreLimit,
  ok,
  fail,
  ValidationError,
  ConflictError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { createStoreSchema } from "@/lib/validations"

export const GET = withUserAuth(
  withRateLimit("api", { keyBy: "user" })(async (_req, { auth }) => {
    const queryStartedAt = performance.now()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true })

    if (error) return fail(error)
    const response = ok(data ?? [])
    response.headers.set("X-StoresQuery-ms", (performance.now() - queryStartedAt).toFixed(2))
    return response
  })
)

export const POST = withUserAuth(
  withPlan()(
    withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
      const body = (await req.json()) as unknown
      const parsed = createStoreSchema.safeParse(body)
      if (!parsed.success) {
        return fail(
          new ValidationError(
            parsed.error.errors[0]?.message ?? "Invalide",
            Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
          )
        )
      }

      await assertStoreLimit(auth.user.id, auth.plan)

      const supabase = await createClient()
      const { data: slugTaken } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", parsed.data.slug)
        .maybeSingle()

      if (slugTaken) {
        return fail(new ConflictError("Ce slug est déjà utilisé."))
      }

      const whatsapp =
        parsed.data.whatsapp_number === "" || parsed.data.whatsapp_number === undefined
          ? null
          : parsed.data.whatsapp_number

      const { data, error } = await supabase
        .from("stores")
        .insert({
          user_id: auth.user.id,
          name: parsed.data.name,
          slug: parsed.data.slug,
          description: parsed.data.description ?? null,
          whatsapp_number: whatsapp,
        })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          return fail(new ConflictError("Ce slug est déjà utilisé."))
        }
        return fail(error)
      }

      return ok(data, 201)
    })
  )
)
