import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { PRODUCT_LIST_LOW_STOCK_THRESHOLD } from "@/lib/utils"
import type { ProductDashboardListRow } from "@/types"

type SB = SupabaseClient<Database>

export type DashboardProductListFilters = {
  query: string
  /** Empty string = all categories */
  category: string
  status: "all" | "active" | "draft"
  stock: "all" | "low" | "out" | "ok"
}

export async function fetchDashboardProductCategories(
  supabase: SB,
  storeId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .eq("store_id", storeId)

  if (error) throw error

  const set = new Set<string>()
  for (const row of data ?? []) {
    const c = row.category?.trim()
    if (c) set.add(c)
  }
  return [...set].sort((a, b) => a.localeCompare(b, "fr"))
}

/**
 * Filtered, paginated product rows for the inventory table (variant counts + stock totals).
 */
export async function fetchDashboardProductList(
  supabase: SB,
  storeId: string,
  filters: DashboardProductListFilters,
  page: number,
  pageSize: number
): Promise<{
  rows: ProductDashboardListRow[]
  total: number
  maxStockOnPage: number
}> {
  let idQuery = supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })

  if (filters.query) {
    const escaped = filters.query.replaceAll(",", "\\,")
    idQuery = idQuery.or(
      `name.ilike.%${escaped}%,slug.ilike.%${escaped}%,category.ilike.%${escaped}%`
    )
  }

  if (filters.category) {
    idQuery = idQuery.eq("category", filters.category)
  }

  if (filters.status === "active") {
    idQuery = idQuery.eq("is_active", true)
  } else if (filters.status === "draft") {
    idQuery = idQuery.eq("is_active", false)
  }

  const { data: idRows, error: idErr } = await idQuery
  if (idErr) throw idErr

  const ids = (idRows ?? []).map((r) => r.id)
  if (ids.length === 0) {
    return { rows: [], total: 0, maxStockOnPage: 1 }
  }

  const { data: variantRows, error: vErr } = await supabase
    .from("product_variants")
    .select("product_id, stock_quantity, sku")
    .in("product_id", ids)

  if (vErr) throw vErr

  type Agg = { total: number; count: number; firstSku: string | null }
  const stockByProduct = new Map<string, Agg>()
  for (const id of ids) {
    stockByProduct.set(id, { total: 0, count: 0, firstSku: null })
  }

  for (const v of variantRows ?? []) {
    const cur = stockByProduct.get(v.product_id)
    if (!cur) continue
    cur.total += v.stock_quantity
    cur.count += 1
    if (!cur.firstSku && v.sku?.trim()) {
      cur.firstSku = v.sku.trim()
    }
  }

  const filteredIds = ids.filter((id) => {
    const s = stockByProduct.get(id)!.total
    if (filters.stock === "low") {
      return s > 0 && s < PRODUCT_LIST_LOW_STOCK_THRESHOLD
    }
    if (filters.stock === "out") {
      return s === 0
    }
    if (filters.stock === "ok") {
      return s >= PRODUCT_LIST_LOW_STOCK_THRESHOLD
    }
    return true
  })

  const total = filteredIds.length
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * pageSize
  const pageIds = filteredIds.slice(start, start + pageSize)

  if (pageIds.length === 0) {
    return { rows: [], total, maxStockOnPage: 1 }
  }

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, name, slug, category, base_price, is_active, images, created_at")
    .in("id", pageIds)

  if (pErr) throw pErr

  const orderMap = new Map(pageIds.map((id, i) => [id, i]))
  const sorted = [...(products ?? [])].sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  )

  const rows: ProductDashboardListRow[] = sorted.map((p) => {
    const agg = stockByProduct.get(p.id)!
    const compactId = p.id.replace(/-/g, "").slice(0, 6).toUpperCase()
    const reference_label = agg.firstSku ? `REF: ${agg.firstSku}` : `REF: ${compactId}`

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      base_price: p.base_price,
      is_active: p.is_active,
      images: p.images ?? [],
      reference_label,
      variant_count: agg.count,
      total_stock: agg.total,
      created_at: p.created_at,
    }
  })

  const maxStockOnPage = Math.max(1, ...rows.map((r) => r.total_stock))

  return { rows, total, maxStockOnPage }
}
