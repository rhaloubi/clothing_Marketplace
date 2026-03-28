import { type NextRequest } from "next/server"
import {
  withUserAuth,
  withRateLimit,
  ok,
  fail,
  noContent,
  BadRequestError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { updateAttributeValueSchema } from "@/lib/validations"
import { assertStoreOwnership } from "@/lib/utils"
import type { Database } from "@/types/database.types"

type ValueUpdate = Database["public"]["Tables"]["attribute_values"]["Update"]

export const PATCH = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth, params }) => {
    const definitionId = params.id
    const valueId = params.valueId
    if (!definitionId || !valueId) {
      return fail(new BadRequestError("Identifiants attribut et valeur requis."))
    }

    const body = (await req.json()) as unknown
    const parsed = updateAttributeValueSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()

    const { data: existing, error: loadErr } = await supabase
      .from("attribute_values")
      .select("id, attribute_definition_id")
      .eq("id", valueId)
      .maybeSingle()

    if (loadErr) return fail(loadErr)
    if (!existing) return fail(new NotFoundError("Valeur d'attribut"))
    if (existing.attribute_definition_id !== definitionId) {
      return fail(new NotFoundError("Valeur d'attribut"))
    }

    const { data: def, error: dErr } = await supabase
      .from("attribute_definitions")
      .select("store_id")
      .eq("id", definitionId)
      .single()

    if (dErr || !def) return fail(new NotFoundError("Attribut"))

    try {
      await assertStoreOwnership(supabase, def.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const patch = parsed.data
    const row: ValueUpdate = {}
    if (patch.label !== undefined) row.label = patch.label
    if (patch.value !== undefined) row.value = patch.value
    if (patch.color_hex !== undefined) row.color_hex = patch.color_hex
    if (patch.sort_order !== undefined) row.sort_order = patch.sort_order

    const { data: updated, error: upErr } = await supabase
      .from("attribute_values")
      .update(row)
      .eq("id", valueId)
      .select()
      .single()

    if (upErr) {
      if (upErr.code === "23505") {
        return fail(
          new ConflictError("Une valeur avec ce code existe déjà pour cet attribut.")
        )
      }
      return fail(upErr)
    }

    return ok(updated)
  })
)

export const DELETE = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (_req, { auth, params }) => {
    const definitionId = params.id
    const valueId = params.valueId
    if (!definitionId || !valueId) {
      return fail(new BadRequestError("Identifiants attribut et valeur requis."))
    }

    const supabase = await createClient()

    const { data: existing, error: loadErr } = await supabase
      .from("attribute_values")
      .select("id, attribute_definition_id")
      .eq("id", valueId)
      .maybeSingle()

    if (loadErr) return fail(loadErr)
    if (!existing) return fail(new NotFoundError("Valeur d'attribut"))
    if (existing.attribute_definition_id !== definitionId) {
      return fail(new NotFoundError("Valeur d'attribut"))
    }

    const { data: def, error: dErr } = await supabase
      .from("attribute_definitions")
      .select("store_id")
      .eq("id", definitionId)
      .single()

    if (dErr || !def) return fail(new NotFoundError("Attribut"))

    try {
      await assertStoreOwnership(supabase, def.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { count, error: cErr } = await supabase
      .from("variant_attribute_values")
      .select("*", { count: "exact", head: true })
      .eq("attribute_value_id", valueId)

    if (cErr) return fail(cErr)
    if ((count ?? 0) > 0) {
      return fail(
        new ConflictError(
          "Impossible de supprimer cette valeur : elle est encore liée à une ou plusieurs variantes."
        )
      )
    }

    const { error: delErr } = await supabase.from("attribute_values").delete().eq("id", valueId)
    if (delErr) return fail(delErr)

    return noContent()
  })
)
