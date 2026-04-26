import { type NextRequest } from "next/server"
import {
  withUserAuth,
  withRateLimit,
  ok,
  fail,
  BadRequestError,
  ValidationError,
  NotFoundError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { productVariantSchema } from "@/lib/validations"
import { assertAttributeValuesBelongToStore } from "@/lib/server/catalog"
import type { Database } from "@/types/database.types"
import type { ProductVariant, VariantAttributeSummary } from "@/types"

type VariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"]
type VavInsert = Database["public"]["Tables"]["variant_attribute_values"]["Insert"]

type VavExpandRow = {
  attribute_value_id: string
  attribute_values: {
    label: string
    color_hex: string | null
    attribute_definitions: { name: string } | null
  } | null
}

type VariantExpandRow = Database["public"]["Tables"]["product_variants"]["Row"] & {
  variant_attribute_values: VavExpandRow[] | null
}

function definitionNameFromEmbed(
  def: { name: string } | { name: string }[] | null | undefined
): string | null {
  if (!def) return null
  const row = Array.isArray(def) ? def[0] : def
  return row?.name ?? null
}

function attributeValueFromEmbed(
  av: VavExpandRow["attribute_values"]
): { label: string; color_hex: string | null; attribute_definitions: { name: string } | null } | null {
  return av ?? null
}

function mapExpandedVariant(row: VariantExpandRow): ProductVariant {
  const links = row.variant_attribute_values ?? []
  const attributes: VariantAttributeSummary[] = []
  for (const link of links) {
    const av = attributeValueFromEmbed(link.attribute_values)
    const defName = definitionNameFromEmbed(av?.attribute_definitions ?? null)
    if (!av || !defName) continue
    attributes.push({
      definition_name: defName,
      value_label: av.label,
      color_hex: av.color_hex,
    })
  }
  return {
    id: row.id,
    product_id: row.product_id,
    sku: row.sku,
    price_override: row.price_override,
    stock_quantity: row.stock_quantity,
    images: row.images,
    is_active: row.is_active,
    attributes,
  }
}

/**
 * GET `/api/products/:id/variants` — liste des déclinaisons du produit.
 * Sans query : lignes brutes `product_variants` (rétrocompatible).
 * Avec `?expand=attributes` : tableau typé {@link ProductVariant} avec `attributes` résolu.
 */
export const GET = withUserAuth(
  withRateLimit("api", { keyBy: "user" })(async (req, { auth, params }) => {
    const productId = params.id
    if (!productId) return fail(new BadRequestError("Identifiant produit requis."))
    const supabase = await createClient()

    // Single query: verify product exists AND belongs to a store owned by this user
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, stores!inner(user_id)")
      .eq("id", productId)
      .eq("stores.user_id", auth.user.id)
      .single()

    if (pErr ?? !product) return fail(new NotFoundError("Produit"))

    const expand = req.nextUrl.searchParams.get("expand") === "attributes"

    if (!expand) {
      const { data: variants, error: vErr } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true })

      if (vErr) return fail(vErr)
      return ok(variants ?? [])
    }

    const { data: rows, error: vErr } = await supabase
      .from("product_variants")
      .select(
        `
        id,
        product_id,
        sku,
        price_override,
        stock_quantity,
        images,
        is_active,
        created_at,
        updated_at,
        variant_attribute_values (
          attribute_value_id,
          attribute_values (
            label,
            color_hex,
            attribute_definitions ( name )
          )
        )
      `
      )
      .eq("product_id", productId)
      .order("created_at", { ascending: true })

    if (vErr) return fail(vErr)
    const list = (rows ?? []) as VariantExpandRow[]
    return ok(list.map(mapExpandedVariant))
  })
)

export const POST = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth, params }) => {
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

    // Single query: verify product exists AND belongs to a store owned by this user; get store_id for downstream checks
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, store_id, stores!inner(user_id)")
      .eq("id", productId)
      .eq("stores.user_id", auth.user.id)
      .single()

    if (pErr ?? !product) return fail(new NotFoundError("Produit"))

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
