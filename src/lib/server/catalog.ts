import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { NotFoundError, ValidationError } from "@/lib/api/errors"
import type { AttributeDisplayType, ProductWithVariants } from "@/types"

type SB = SupabaseClient<Database>

/**
 * Ensures every attribute value ID belongs to an attribute definition on this store.
 */
export async function assertAttributeValuesBelongToStore(
  supabase: SB,
  storeId: string,
  valueIds: string[]
): Promise<void> {
  if (valueIds.length === 0) {
    throw new ValidationError("Au moins une valeur d'attribut est requise.")
  }

  const unique = [...new Set(valueIds)]
  const { data: vals, error: vErr } = await supabase
    .from("attribute_values")
    .select("id, attribute_definition_id")
    .in("id", unique)

  if (vErr) throw vErr
  if (vals?.length !== unique.length) {
    throw new NotFoundError("Valeur d'attribut")
  }

  const defIds = [...new Set(vals.map((v) => v.attribute_definition_id))]
  const { data: defs, error: dErr } = await supabase
    .from("attribute_definitions")
    .select("id, store_id")
    .in("id", defIds)

  if (dErr) throw dErr
  if (!defs || defs.some((d) => d.store_id !== storeId)) {
    throw new ValidationError("Les attributs ne correspondent pas à cette boutique.")
  }
}

/**
 * Load product + variants + attribute definitions used by those variants (merchant/dashboard).
 */
export async function fetchProductWithVariants(
  supabase: SB,
  productId: string
): Promise<ProductWithVariants | null> {
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single()

  if (pErr || !product) return null

  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true })

  if (vErr) throw vErr

  const variantList = variants ?? []
  const variantIds = variantList.map((v) => v.id)

  let links: { variant_id: string; attribute_value_id: string }[] = []
  if (variantIds.length > 0) {
    const { data: lav, error: lErr } = await supabase
      .from("variant_attribute_values")
      .select("variant_id, attribute_value_id")
      .in("variant_id", variantIds)

    if (lErr) throw lErr
    links = lav ?? []
  }

  const valueIds = [...new Set(links.map((l) => l.attribute_value_id))]

  type AvRow = {
    id: string
    label: string
    value: string
    color_hex: string | null
    sort_order: number
    attribute_definition_id: string
    attribute_definitions: { id: string; name: string } | null
  }

  let avRows: AvRow[] = []
  if (valueIds.length > 0) {
    const { data: rows, error: avErr } = await supabase
      .from("attribute_values")
      .select(
        `
        id,
        label,
        value,
        color_hex,
        sort_order,
        attribute_definition_id,
        attribute_definitions ( id, name )
      `
      )
      .in("id", valueIds)

    if (avErr) throw avErr
    avRows = (rows ?? []) as AvRow[]
  }

  const valueMap = new Map(avRows.map((r) => [r.id, r]))
  const defIdsFromValues = [...new Set(avRows.map((r) => r.attribute_definition_id))]

  let defsFull: {
    id: string
    store_id: string
    name: string
    display_type: string
    is_required: boolean
    sort_order: number
  }[] = []

  if (defIdsFromValues.length > 0) {
    const { data: drows, error: dErr } = await supabase
      .from("attribute_definitions")
      .select("id, store_id, name, display_type, is_required, sort_order")
      .in("id", defIdsFromValues)

    if (dErr) throw dErr
    defsFull = drows ?? []
  }

  const definitions = defsFull.map((d) => ({
    id: d.id,
    store_id: d.store_id,
    name: d.name,
    display_type: d.display_type as AttributeDisplayType,
    is_required: d.is_required,
    sort_order: d.sort_order,
    values: avRows
      .filter((r) => r.attribute_definition_id === d.id)
      .map((r) => ({
        id: r.id,
        attribute_definition_id: r.attribute_definition_id,
        label: r.label,
        value: r.value,
        color_hex: r.color_hex,
        sort_order: r.sort_order,
      })),
  }))

  const variantsOut = variantList.map((v) => {
    const vLinks = links.filter((l) => l.variant_id === v.id)
    const attributes = vLinks
      .map((l) => {
        const av = valueMap.get(l.attribute_value_id)
        if (!av?.attribute_definitions) return null
        return {
          definition_name: av.attribute_definitions.name,
          value_label: av.label,
          color_hex: av.color_hex,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    return {
      id: v.id,
      product_id: v.product_id,
      sku: v.sku,
      price_override: v.price_override,
      stock_quantity: v.stock_quantity,
      images: v.images,
      is_active: v.is_active,
      attributes,
    }
  })

  return {
    ...product,
    images: product.images ?? [],
    variants: variantsOut,
    attribute_definitions: definitions,
  }
}

/** All attribute definitions for a store with values — same shape as GET /api/attributes. */
export type StoreAttributeDefinitionWithValues = {
  id: string
  store_id: string
  name: string
  display_type: string
  is_required: boolean
  sort_order: number
  values: Array<{
    id: string
    attribute_definition_id: string
    label: string
    value: string
    color_hex: string | null
    sort_order: number
  }>
}

export async function fetchStoreAttributeDefinitionsWithValues(
  supabase: SB,
  storeId: string
): Promise<StoreAttributeDefinitionWithValues[]> {
  const { data: defs, error: dErr } = await supabase
    .from("attribute_definitions")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })

  if (dErr) throw dErr

  const ids = (defs ?? []).map((d) => d.id)
  const valuesByDef = new Map<string, StoreAttributeDefinitionWithValues["values"]>()

  if (ids.length > 0) {
    const { data: vals, error: vErr } = await supabase
      .from("attribute_values")
      .select("*")
      .in("attribute_definition_id", ids)
      .order("sort_order", { ascending: true })

    if (vErr) throw vErr
    for (const v of vals ?? []) {
      const list = valuesByDef.get(v.attribute_definition_id) ?? []
      list.push({
        id: v.id,
        attribute_definition_id: v.attribute_definition_id,
        label: v.label,
        value: v.value,
        color_hex: v.color_hex,
        sort_order: v.sort_order,
      })
      valuesByDef.set(v.attribute_definition_id, list)
    }
  }

  return (defs ?? []).map((d) => ({
    id: d.id,
    store_id: d.store_id,
    name: d.name,
    display_type: d.display_type,
    is_required: d.is_required,
    sort_order: d.sort_order,
    values: valuesByDef.get(d.id) ?? [],
  }))
}

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategoryRow = {
  id: string
  store_id: string
  name: string
  slug: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type CategoryWithCount = CategoryRow & { product_count: number }

/** Fetch all categories for a store ordered by sort_order, with a product count. */
export async function fetchStoreCategories(
  supabase: SB,
  storeId: string
): Promise<CategoryWithCount[]> {
  const { data: cats, error: cErr } = await supabase
    .from("categories")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (cErr) throw cErr
  const rows = cats ?? []
  if (rows.length === 0) return []

  const countMap = new Map<string, number>()

  // Prefer DB aggregation via RPC when available.
  const { data: counts, error: countErr } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: unknown }>
  }).rpc("get_store_category_counts", { p_store_id: storeId })

  if (!countErr) {
    for (const row of (counts ?? []) as unknown as {
      category_id: string
      product_count: number
    }[]) {
      countMap.set(row.category_id, row.product_count ?? 0)
    }
  } else {
    // Backward-compatible fallback until the DB function is deployed everywhere.
    const ids = rows.map((c) => c.id)
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("category_id")
      .eq("store_id", storeId)
      .in("category_id", ids)

    if (pErr) throw pErr
    for (const p of products ?? []) {
      if (!p.category_id) continue
      countMap.set(p.category_id, (countMap.get(p.category_id) ?? 0) + 1)
    }
  }

  return rows.map((c) => ({ ...c, product_count: countMap.get(c.id) ?? 0 }))
}

/** Per attribute_definition_id: count of distinct product_variants in this store that use at least one of its values. */
export async function fetchAttributeDefinitionUsageCounts(
  supabase: SB,
  storeId: string
): Promise<Record<string, number>> {
  const { data: storeProducts, error: pErr } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)

  if (pErr) throw pErr
  const productIds = (storeProducts ?? []).map((p) => p.id)
  if (productIds.length === 0) return {}

  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("id")
    .in("product_id", productIds)

  if (vErr) throw vErr
  const variantIds = (variants ?? []).map((v) => v.id)
  if (variantIds.length === 0) return {}

  const { data: links, error: lErr } = await supabase
    .from("variant_attribute_values")
    .select("variant_id, attribute_value_id")
    .in("variant_id", variantIds)

  if (lErr) throw lErr
  const linkRows = links ?? []
  const valueIds = [...new Set(linkRows.map((l) => l.attribute_value_id))]
  if (valueIds.length === 0) return {}

  const { data: vals, error: avErr } = await supabase
    .from("attribute_values")
    .select("id, attribute_definition_id")
    .in("id", valueIds)

  if (avErr) throw avErr
  const valueToDef = new Map((vals ?? []).map((v) => [v.id, v.attribute_definition_id]))

  const defToVariants = new Map<string, Set<string>>()
  for (const link of linkRows) {
    const defId = valueToDef.get(link.attribute_value_id)
    if (!defId) continue
    const set = defToVariants.get(defId) ?? new Set()
    set.add(link.variant_id)
    defToVariants.set(defId, set)
  }

  const out: Record<string, number> = {}
  for (const [defId, set] of defToVariants) {
    out[defId] = set.size
  }
  return out
}

export type StoreCategorySummaryRow = { category: string; productCount: number }

/** Distinct non-empty product categories for a store, ordered by usage (desc). */
export async function fetchStoreCategorySummary(
  supabase: SB,
  storeId: string
): Promise<StoreCategorySummaryRow[]> {
  const { data: rows, error } = await supabase.from("products").select("category").eq("store_id", storeId)

  if (error) throw error

  const counts = new Map<string, number>()
  for (const row of rows ?? []) {
    const c = row.category?.trim()
    if (!c) continue
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([category, productCount]) => ({ category, productCount }))
    .sort((a, b) => b.productCount - a.productCount)
}
