import { type NextRequest } from "next/server"
import {
  withUserAuth,
  withRateLimit,
  ok,
  fail,
  noContent,
  BadRequestError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { updateStoreSchema } from "@/lib/validations"
import type { Database } from "@/types/database.types"

type StoreUpdate = Database["public"]["Tables"]["stores"]["Update"]

export const GET = withUserAuth(
  withRateLimit("api", { keyBy: "user" })(async (_req, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant boutique requis."))

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .single()

    if (error ?? !data) return fail(new NotFoundError("Boutique"))
    return ok(data)
  })
)

export const PATCH = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant boutique requis."))

    const body = (await req.json()) as unknown
    const parsed = updateStoreSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()
    const { data: store, error: ownerErr } = await supabase
      .from("stores")
      .select("id")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .single()

    if (ownerErr ?? !store) return fail(new NotFoundError("Boutique"))

    const patch = parsed.data
    if (Object.keys(patch).length === 0) {
      const { data: cur } = await supabase.from("stores").select("*").eq("id", id).single()
      if (!cur) return fail(new NotFoundError("Boutique"))
      return ok(cur)
    }

    const row: StoreUpdate = {}
    if (patch.name !== undefined) row.name = patch.name
    if (patch.slug !== undefined) row.slug = patch.slug
    if (patch.description !== undefined) row.description = patch.description
    if (patch.whatsapp_number !== undefined) {
      row.whatsapp_number =
        patch.whatsapp_number === "" || patch.whatsapp_number === null
          ? null
          : patch.whatsapp_number
    }
    if (patch.theme !== undefined) row.theme = patch.theme
    if (patch.theme_config !== undefined) row.theme_config = patch.theme_config as StoreUpdate["theme_config"]
    if (patch.custom_domain !== undefined) row.custom_domain = patch.custom_domain
    if (patch.meta_title !== undefined) row.meta_title = patch.meta_title
    if (patch.meta_description !== undefined) row.meta_description = patch.meta_description
    if (patch.is_active !== undefined) row.is_active = patch.is_active
    if (patch.logo_url !== undefined) row.logo_url = patch.logo_url
    if (patch.banner_url !== undefined) row.banner_url = patch.banner_url

    const { data, error } = await supabase.from("stores").update(row).eq("id", id).select().single()
    if (error) {
      if (error.code === "23505") {
        return fail(
          new ConflictError("Ce lien d’adresse est déjà utilisé. Choisissez-en un autre.")
        )
      }
      return fail(error)
    }
    return ok(data)
  })
)

export const DELETE = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (_req, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant boutique requis."))

    const supabase = await createClient()
    const { data: store, error: ownerErr } = await supabase
      .from("stores")
      .select("id")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .single()

    if (ownerErr ?? !store) return fail(new NotFoundError("Boutique"))

    const { error } = await supabase.from("stores").delete().eq("id", id)
    if (error) {
      if (error.code === "23503") {
        return fail(
          new ConflictError(
            "Impossible de supprimer cette boutique : des commandes y sont liées. Désactivez-la plutôt (PATCH is_active: false)."
          )
        )
      }
      return fail(error)
    }

    return noContent()
  })
)
