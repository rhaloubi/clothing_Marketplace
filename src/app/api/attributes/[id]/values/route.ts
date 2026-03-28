import { type NextRequest } from "next/server"
import {
  withUserAuth,
  withRateLimit,
  ok,
  fail,
  BadRequestError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { createAttributeValueSchema } from "@/lib/validations"
import { assertStoreOwnership } from "@/lib/utils"

export const POST = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth, params }) => {
    const definitionId = params.id
    if (!definitionId) return fail(new BadRequestError("Identifiant attribut requis."))

    const body = (await req.json()) as unknown
    const parsed = createAttributeValueSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()
    const { data: def, error: dErr } = await supabase
      .from("attribute_definitions")
      .select("id, store_id")
      .eq("id", definitionId)
      .maybeSingle()

    if (dErr) return fail(dErr)
    if (!def) return fail(new NotFoundError("Attribut"))

    try {
      await assertStoreOwnership(supabase, def.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { data: row, error: insErr } = await supabase
      .from("attribute_values")
      .insert({
        attribute_definition_id: definitionId,
        label: parsed.data.label,
        value: parsed.data.value,
        color_hex: parsed.data.color_hex ?? null,
        sort_order: parsed.data.sort_order,
      })
      .select()
      .single()

    if (insErr) {
      if (insErr.code === "23505") {
        return fail(
          new ConflictError("Une valeur avec ce code existe déjà pour cet attribut.")
        )
      }
      return fail(insErr)
    }

    return ok(row, 201)
  })
)
