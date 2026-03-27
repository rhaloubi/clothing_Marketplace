import { type NextRequest } from "next/server"
import {
  withAuth,
  withRateLimit,
  ok,
  fail,
  BadRequestError,
  ValidationError,
  NotFoundError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { productVariantSchema } from "@/lib/validations"
import { assertStoreOwnership } from "@/lib/utils"
import { assertAttributeValuesBelongToStore } from "@/lib/server/catalog"
import type { Database } from "@/types/database.types"

type VariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"]
type VavInsert = Database["public"]["Tables"]["variant_attribute_values"]["Insert"]

export const GET = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (_req, { auth, params }) => {
    const productId = params.id
    if (!productId) return fail(new BadRequestError("Identifiant produit requis."))
    const supabase = await createClient()

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("store_id")
      .eq("id", productId)
      .maybeSingle()

    if (pErr) return fail(pErr)
    if (!product) return fail(new NotFoundError("Produit"))

    try {
      await assertStoreOwnership(supabase, product.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { data: variants, error: vErr } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: true })

    if (vErr) return fail(vErr)
    return ok(variants ?? [])
  })
)

export const POST = withRateLimit("write", { keyBy: "user" })(
  withAuth(async (req: NextRequest, { auth, params }) => {
    const productId = params.id
    if (!productId) return fail(new BadRequestError("Identifiant produit requis."))
    const body = (await req.json()) as unknown
    const parsed = productVariantSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("store_id")
      .eq("id", productId)
      .maybeSingle()

    if (pErr) return fail(pErr)
    if (!product) return fail(new NotFoundError("Produit"))

    try {
      await assertStoreOwnership(supabase, product.store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    try {
      await assertAttributeValuesBelongToStore(
        supabase,
        product.store_id,
        parsed.data.attribute_value_ids
      )
    } catch (err) {
      return fail(err)
    }

    const row: VariantInsert = {
      product_id: productId,
      sku: parsed.data.sku ?? null,
      price_override: parsed.data.price_override ?? null,
      stock_quantity: parsed.data.stock_quantity,
      images: parsed.data.images,
      is_active: parsed.data.is_active ?? true,
    }

    const { data: variant, error: insErr } = await supabase
      .from("product_variants")
      .insert(row)
      .select()
      .single()

    if (insErr) return fail(insErr)

    const vavRows: VavInsert[] = parsed.data.attribute_value_ids.map((attribute_value_id) => ({
      variant_id: variant.id,
      attribute_value_id,
    }))

    const { error: linkErr } = await supabase.from("variant_attribute_values").insert(vavRows)
    if (linkErr) {
      await supabase.from("product_variants").delete().eq("id", variant.id)
      return fail(linkErr)
    }

    return ok(variant, 201)
  })
)
