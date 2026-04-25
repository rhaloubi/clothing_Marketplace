/**
 * Normalizes JSONB `images` fields from products / variants (unknown at API boundaries).
 */
export function imagesArrayFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  )
}

function isUsableCatalogImageUrl(url: string): boolean {
  const t = url.trim()
  if (!t.startsWith("http")) return false
  if (t.includes("example.com")) return false
  return true
}

/**
 * First displayable image: variant gallery, then product gallery (same rule as storefront).
 */
export function primaryCatalogImageUrl(
  variantImages: string[],
  productImages: string[]
): string | null {
  for (const u of variantImages) {
    if (isUsableCatalogImageUrl(u)) return u.trim()
  }
  for (const u of productImages) {
    if (isUsableCatalogImageUrl(u)) return u.trim()
  }
  return null
}

/** PostgREST embed: `products` may be an object or a single-element array. */
export function productImagesFromEmbed(products: unknown): string[] {
  if (!products) return []
  const row: unknown = Array.isArray(products)
    ? (products as readonly unknown[])[0]
    : products
  if (row === null || row === undefined || typeof row !== "object" || !("images" in row)) {
    return []
  }
  const rec = row as Record<string, unknown>
  return imagesArrayFromUnknown(rec.images)
}

export function isPlaceholderProductImage(url: string | null | undefined): boolean {
  const t = url?.trim() ?? ""
  if (!t) return true
  if (!t.startsWith("http")) return true
  if (t.includes("example.com")) return true
  return false
}
