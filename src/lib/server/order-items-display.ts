import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import type { OrderItem } from "@/types"
import {
  imagesArrayFromUnknown,
  isPlaceholderProductImage,
  primaryCatalogImageUrl,
  productImagesFromEmbed,
} from "@/lib/server/catalog-images"

type SB = SupabaseClient<Database>

type VariantJoinRow = {
  id: string
  images: unknown
  products: unknown
}

/**
 * Prefer live catalog images over `order_items.product_image` snapshots so dashboard
 * (and API consumers) recover from stale placeholders or renamed storage paths.
 */
export async function enrichOrderItemsPrimaryImages(
  supabase: SB,
  items: OrderItem[]
): Promise<OrderItem[]> {
  const enrichable = items.filter((i) => i.variant_id || i.product_id)
  if (enrichable.length === 0) {
    return items.map((item) =>
      isPlaceholderProductImage(item.product_image)
        ? { ...item, product_image: null }
        : item
    )
  }

  const variantIds = [
    ...new Set(enrichable.map((i) => i.variant_id).filter(Boolean)),
  ] as string[]
  const productIds = [
    ...new Set(enrichable.map((i) => i.product_id).filter(Boolean)),
  ] as string[]

  const variantMap = new Map<string, string | null>()
  if (variantIds.length > 0) {
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, images, products ( images )")
      .in("id", variantIds)

    if (!error && data) {
      for (const row of data as VariantJoinRow[]) {
        const pImgs = productImagesFromEmbed(row.products)
        const vImgs = imagesArrayFromUnknown(row.images)
        variantMap.set(row.id, primaryCatalogImageUrl(vImgs, pImgs))
      }
    }
  }

  const productMap = new Map<string, string | null>()
  if (productIds.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("id, images")
      .in("id", productIds)

    if (!error && data) {
      for (const row of data) {
        const pImgs = imagesArrayFromUnknown(row.images)
        productMap.set(row.id, primaryCatalogImageUrl([], pImgs))
      }
    }
  }

  return items.map((item) => {
    let liveUrl: string | null | undefined
    if (item.variant_id) liveUrl = variantMap.get(item.variant_id)
    if (!liveUrl?.trim() && item.product_id) {
      liveUrl = productMap.get(item.product_id) ?? null
    }

    if (liveUrl?.trim()) return { ...item, product_image: liveUrl }

    if (isPlaceholderProductImage(item.product_image)) {
      return { ...item, product_image: null }
    }

    return item
  })
}
