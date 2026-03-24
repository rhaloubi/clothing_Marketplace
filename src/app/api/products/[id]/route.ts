import { type NextRequest } from "next/server"
import {
  withAuth,
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
import { updateProductSchema } from "@/lib/validations"
import { assertStoreOwnership, generateSlug } from "@/lib/utils"
import { fetchProductWithVariants } from "@/lib/server/catalog"
import type { Database } from "@/types/database.types"

type ProductUpdate = Database["public"]["Tables"]["products"]["Update"]

export const GET = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (_req, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant produit requis."))
    const supabase = await createClient()

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("store_id")
      .eq("id", id)
      .maybeSingle()

    if (pErr) return fail(pErr)
    if (!product) return fail(new NotFoundError("Produit"))

    try {
      await assertStoreOwnership(supabase, product.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    try {
      const full = await fetchProductWithVariants(supabase, id)
      if (!full) return fail(new NotFoundError("Produit"))
      return ok(full)
    } catch (err) {
      return fail(err)
    }
  })
)

export const PATCH = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (req: NextRequest, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant produit requis."))
    const body = (await req.json()) as unknown
    const parsed = updateProductSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()
    const { data: existing, error: exErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (exErr) return fail(exErr)
    if (!existing) return fail(new NotFoundError("Produit"))

    try {
      await assertStoreOwnership(supabase, existing.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const patch = parsed.data
    const updateRow: ProductUpdate = {}

    if (patch.name !== undefined) updateRow.name = patch.name
    if (patch.description !== undefined) updateRow.description = patch.description ?? null
    if (patch.category !== undefined) updateRow.category = patch.category ?? null
    if (patch.base_price !== undefined) updateRow.base_price = patch.base_price
    if (patch.compare_price !== undefined) updateRow.compare_price = patch.compare_price
    if (patch.images !== undefined) updateRow.images = patch.images
    if (patch.is_active !== undefined) updateRow.is_active = patch.is_active
    if (patch.is_featured !== undefined) updateRow.is_featured = patch.is_featured
    if (patch.meta_title !== undefined) updateRow.meta_title = patch.meta_title
    if (patch.meta_description !== undefined) updateRow.meta_description = patch.meta_description

    if (patch.slug !== undefined) {
      const s = patch.slug.trim()
      updateRow.slug = s ? generateSlug(s) : generateSlug(existing.name)
    }

    if (Object.keys(updateRow).length === 0) {
      return ok(existing)
    }

    const { data, error } = await supabase
      .from("products")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return fail(new ConflictError("Ce slug est déjà utilisé pour un produit dans cette boutique."))
      }
      return fail(error)
    }

    return ok(data)
  })
)

export const DELETE = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (_req, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant produit requis."))
    const supabase = await createClient()

    const { data: existing, error: exErr } = await supabase
      .from("products")
      .select("store_id")
      .eq("id", id)
      .maybeSingle()

    if (exErr) return fail(exErr)
    if (!existing) return fail(new NotFoundError("Produit"))

    try {
      await assertStoreOwnership(supabase, existing.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { error } = await supabase.from("products").delete().eq("id", id)
    if (error) return fail(error)

    return noContent()
  })
)
