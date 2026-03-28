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
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { updateAttributeDefinitionSchema } from "@/lib/validations"
import type { Database } from "@/types/database.types"

type DefUpdate = Database["public"]["Tables"]["attribute_definitions"]["Update"]

export const GET = withUserAuth(
  withRateLimit("api", { keyBy: "user" })(async (_req, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant attribut requis."))
    const supabase = await createClient()

    // Single query: verify attribute exists AND belongs to a store owned by this user
    const { data: def, error: dErr } = await supabase
      .from("attribute_definitions")
      .select("*, stores!inner(user_id)")
      .eq("id", id)
      .eq("stores.user_id", auth.user.id)
      .single()

    if (dErr ?? !def) return fail(new NotFoundError("Attribut"))

    const { data: vals, error: vErr } = await supabase
      .from("attribute_values")
      .select("*")
      .eq("attribute_definition_id", id)
      .order("sort_order", { ascending: true })

    if (vErr) return fail(vErr)

    return ok({ ...def, values: vals ?? [] })
  })
)

export const PATCH = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant attribut requis."))
    const body = (await req.json()) as unknown
    const parsed = updateAttributeDefinitionSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()

    // Single query: verify attribute exists AND belongs to a store owned by this user
    const { data: existing, error: exErr } = await supabase
      .from("attribute_definitions")
      .select("*, stores!inner(user_id)")
      .eq("id", id)
      .eq("stores.user_id", auth.user.id)
      .single()

    if (exErr ?? !existing) return fail(new NotFoundError("Attribut"))

    const patch = parsed.data
    const updateRow: DefUpdate = {}
    if (patch.name !== undefined) updateRow.name = patch.name
    if (patch.display_type !== undefined) updateRow.display_type = patch.display_type
    if (patch.is_required !== undefined) updateRow.is_required = patch.is_required
    if (patch.sort_order !== undefined) updateRow.sort_order = patch.sort_order

    if (Object.keys(updateRow).length > 0) {
      const { error: uErr } = await supabase.from("attribute_definitions").update(updateRow).eq("id", id)
      if (uErr) return fail(uErr)
    }

    const { data: def, error: defErr } = await supabase
      .from("attribute_definitions")
      .select("*")
      .eq("id", id)
      .single()
    if (defErr) return fail(defErr)

    const { data: vals } = await supabase
      .from("attribute_values")
      .select("*")
      .eq("attribute_definition_id", id)
      .order("sort_order", { ascending: true })

    return ok({ ...def, values: vals ?? [] })
  })
)

export const DELETE = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (_req, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant attribut requis."))
    const supabase = await createClient()

    // Single query: verify attribute exists AND belongs to a store owned by this user
    const { data: existing, error: exErr } = await supabase
      .from("attribute_definitions")
      .select("id, stores!inner(user_id)")
      .eq("id", id)
      .eq("stores.user_id", auth.user.id)
      .single()

    if (exErr ?? !existing) return fail(new NotFoundError("Attribut"))

    const { error } = await supabase.from("attribute_definitions").delete().eq("id", id)
    if (error) return fail(error)

    return noContent()
  })
)
