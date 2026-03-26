import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { fetchProductWithVariants } from "@/lib/server/catalog"
import type { ProductWithVariants } from "@/types"

type SB = SupabaseClient<Database>

export async function fetchActiveStoreBySlug(
  supabase: SB,
  slug: string
): Promise<{ id: string; slug: string; name: string } | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchStorefrontProductBySlug(
  supabase: SB,
  storeId: string,
  productSlug: string
): Promise<ProductWithVariants | null> {
  const { data: product, error } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("slug", productSlug)
    .eq("is_active", true)
    .maybeSingle()

  if (error) throw error
  if (!product) return null

  const full = await fetchProductWithVariants(supabase, product.id)
  if (!full?.is_active) return null
  return full
}

export async function listStorefrontProducts(
  supabase: SB,
  storeId: string,
  limit: number,
  offset: number
): Promise<{ products: Database["public"]["Tables"]["products"]["Row"][]; total: number }> {
  const { data, error, count } = await supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return { products: data ?? [], total: count ?? 0 }
}

export async function getShippingZonePrice(
  supabase: SB,
  storeId: string,
  wilayaId: number
): Promise<Database["public"]["Tables"]["shipping_zones"]["Row"] | null> {
  const { data, error } = await supabase
    .from("shipping_zones")
    .select("*")
    .eq("store_id", storeId)
    .eq("wilaya_id", wilayaId)
    .eq("is_active", true)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Restores stock after a failed checkout (admin client).
 */
export async function restoreVariantStock(
  admin: SB,
  variantId: string,
  quantity: number
): Promise<void> {
  const { data: row, error: rErr } = await admin
    .from("product_variants")
    .select("stock_quantity")
    .eq("id", variantId)
    .single()

  if (rErr) throw rErr
  if (!row) return

  await admin
    .from("product_variants")
    .update({ stock_quantity: row.stock_quantity + quantity })
    .eq("id", variantId)
}
