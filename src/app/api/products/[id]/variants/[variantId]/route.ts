import { type NextRequest } from "next/server"
import {
  withAuth,
  withRateLimit,
  ok,
  fail,
  noContent,
  BadRequestError,
  ValidationError,
  NotFoundError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { updateProductVariantSchema } from "@/lib/validations"
import { assertStoreOwnership } from "@/lib/utils"
import { assertAttributeValuesBelongToStore } from "@/lib/server/catalog"
import type { Database } from "@/types/database.types"

type VariantUpdate = Database["public"]["Tables"]["product_variants"]["Update"]

async function loadVariantContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  variantId: string
): Promise<
  | { product: { store_id: string }; variant: { id: string; product_id: string } }
  | { notFound: true }
  | { error: unknown }
> {
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("store_id")
    .eq("id", productId)
    .maybeSingle()

  if (pErr) return { error: pErr }
  if (!product) return { notFound: true as const }

  const { data: variant, error: vErr } = await supabase
    .from("product_variants")
    .select("id, product_id")
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle()

  if (vErr) return { error: vErr }
  if (!variant) return { notFound: true as const }

  return { product, variant }
}

export const GET = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (_req, { auth, params }) => {
    const productId = params.id
    const variantId = params.variantId
    if (!productId || !variantId) {
      return fail(new BadRequestError("Identifiants produit et variante requis."))
    }
    const supabase = await createClient()
    const ctx = await loadVariantContext(supabase, productId, variantId)

    if ("error" in ctx) return fail(ctx.error)
    if ("notFound" in ctx) return fail(new NotFoundError("Variante"))

    try {
      await assertStoreOwnership(supabase, ctx.product.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("id", variantId)
      .single()

    if (error) return fail(error)
    return ok(data)
  })
)

export const PATCH = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (req: NextRequest, { auth, params }) => {
    const productId = params.id
    const variantId = params.variantId
    if (!productId || !variantId) {
      return fail(new BadRequestError("Identifiants produit et variante requis."))
    }
    const body = (await req.json()) as unknown
    const parsed = updateProductVariantSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()
    const ctx = await loadVariantContext(supabase, productId, variantId)

    if ("error" in ctx) return fail(ctx.error)
    if ("notFound" in ctx) return fail(new NotFoundError("Variante"))

    try {
      await assertStoreOwnership(supabase, ctx.product.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const patch = parsed.data

    if (patch.attribute_value_ids !== undefined) {
      try {
        await assertAttributeValuesBelongToStore(
          supabase,
          ctx.product.store_id,
          patch.attribute_value_ids
        )
      } catch (err) {
        return fail(err)
      }
    }

    const updateRow: VariantUpdate = {}
    if (patch.sku !== undefined) updateRow.sku = patch.sku
    if (patch.price_override !== undefined) updateRow.price_override = patch.price_override
    if (patch.stock_quantity !== undefined) updateRow.stock_quantity = patch.stock_quantity
    if (patch.images !== undefined) updateRow.images = patch.images
    if (patch.is_active !== undefined) updateRow.is_active = patch.is_active

    if (Object.keys(updateRow).length > 0) {
      const { error: uErr } = await supabase
        .from("product_variants")
        .update(updateRow)
        .eq("id", variantId)

      if (uErr) return fail(uErr)
    }

    if (patch.attribute_value_ids !== undefined) {
      const { error: delErr } = await supabase
        .from("variant_attribute_values")
        .delete()
        .eq("variant_id", variantId)

      if (delErr) return fail(delErr)

      if (patch.attribute_value_ids.length > 0) {
        const { error: insErr } = await supabase.from("variant_attribute_values").insert(
          patch.attribute_value_ids.map((attribute_value_id) => ({
            variant_id: variantId,
            attribute_value_id,
          }))
        )
        if (insErr) return fail(insErr)
      }
    }

    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("id", variantId)
      .single()

    if (error) return fail(error)
    return ok(data)
  })
)

export const DELETE = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (_req, { auth, params }) => {
    const productId = params.id
    const variantId = params.variantId
    if (!productId || !variantId) {
      return fail(new BadRequestError("Identifiants produit et variante requis."))
    }
    const supabase = await createClient()
    const ctx = await loadVariantContext(supabase, productId, variantId)

    if ("error" in ctx) return fail(ctx.error)
    if ("notFound" in ctx) return fail(new NotFoundError("Variante"))

    try {
      await assertStoreOwnership(supabase, ctx.product.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { error } = await supabase.from("product_variants").delete().eq("id", variantId)
    if (error) return fail(error)

    return noContent()
  })
)
