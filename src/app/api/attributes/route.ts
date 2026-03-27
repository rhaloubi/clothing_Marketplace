import { type NextRequest } from "next/server"
import {
  withAuth,
  withRateLimit,
  ok,
  fail,
  ValidationError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import {
  createAttributeDefinitionWithStoreSchema,
  listAttributesQuerySchema,
} from "@/lib/validations"
import { assertStoreOwnership } from "@/lib/utils"

export const GET = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (req, { auth }) => {
    const qs = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = listAttributesQuerySchema.safeParse(qs)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const { store_id } = parsed.data
    const supabase = await createClient()

    try {
      await assertStoreOwnership(supabase, store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { data: defs, error: dErr } = await supabase
      .from("attribute_definitions")
      .select("*")
      .eq("store_id", store_id)
      .order("sort_order", { ascending: true })

    if (dErr) return fail(dErr)

    const ids = (defs ?? []).map((d) => d.id)
    type ValueRow = {
      id: string
      attribute_definition_id: string
      label: string
      value: string
      color_hex: string | null
      sort_order: number
      created_at: string
    }
    const valuesByDef = new Map<string, ValueRow[]>()

    if (ids.length > 0) {
      const { data: vals, error: vErr } = await supabase
        .from("attribute_values")
        .select("*")
        .in("attribute_definition_id", ids)
        .order("sort_order", { ascending: true })

      if (vErr) return fail(vErr)
      for (const v of (vals ?? []) as ValueRow[]) {
        const list = valuesByDef.get(v.attribute_definition_id) ?? []
        list.push(v)
        valuesByDef.set(v.attribute_definition_id, list)
      }
    }

    const payload = (defs ?? []).map((d) => ({
      ...d,
      values: valuesByDef.get(d.id) ?? [],
    }))

    return ok(payload)
  })
)

export const POST = withRateLimit("write", { keyBy: "user" })(
  withAuth(async (req: NextRequest, { auth }) => {
    const body = (await req.json()) as unknown
    const parsed = createAttributeDefinitionWithStoreSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const { store_id, values, ...defFields } = parsed.data
    const supabase = await createClient()

    try {
      await assertStoreOwnership(supabase, store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { data: def, error: dErr } = await supabase
      .from("attribute_definitions")
      .insert({
        store_id,
        name: defFields.name,
        display_type: defFields.display_type,
        is_required: defFields.is_required,
        sort_order: defFields.sort_order,
      })
      .select()
      .single()

    if (dErr) return fail(dErr)

    for (const v of values) {
      const { error: vErr } = await supabase.from("attribute_values").insert({
        attribute_definition_id: def.id,
        label: v.label,
        value: v.value,
        color_hex: v.color_hex ?? null,
        sort_order: v.sort_order,
      })
      if (vErr) {
        await supabase.from("attribute_definitions").delete().eq("id", def.id)
        return fail(vErr)
      }
    }

    const { data: vals } = await supabase
      .from("attribute_values")
      .select("*")
      .eq("attribute_definition_id", def.id)
      .order("sort_order", { ascending: true })

    return ok({ ...def, values: vals ?? [] }, 201)
  })
)
