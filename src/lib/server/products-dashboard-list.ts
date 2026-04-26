import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { PRODUCT_LIST_LOW_STOCK_THRESHOLD } from "@/lib/utils"
import type { ProductDashboardListRow } from "@/types"

type SB = SupabaseClient<Database>

export type DashboardProductListFilters = {
  query: string
  /** Empty string = all categories; UUID = filter to that category */
  category: string
  status: "all" | "active" | "draft"
  stock: "all" | "low" | "out" | "ok"
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
  type Agg = { total: number; count: number; firstSku: string | null }
  const escapedQuery = filters.query ? filters.query.replaceAll(",", "\\,") : ""

  const safePage = Math.max(1, page)
  const start = (safePage - 1) * pageSize
  const end = start + pageSize - 1

  // Fast path: let the DB handle filtering + pagination for the common "all stock" case.
  if (filters.stock === "all") {
    let countQuery = supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
    if (escapedQuery) {
      countQuery = countQuery.or(`name.ilike.%${escapedQuery}%,slug.ilike.%${escapedQuery}%`)
    }
    if (filters.category) {
      countQuery = countQuery.eq("category_id", filters.category)
    }
    if (filters.status === "active") {
      countQuery = countQuery.eq("is_active", true)
    } else if (filters.status === "draft") {
      countQuery = countQuery.eq("is_active", false)
    }
    const { count, error: countErr } = await countQuery
    if (countErr) throw countErr

    const total = count ?? 0
    if (total === 0) {
      return { rows: [], total: 0, maxStockOnPage: 1 }
    }

    let pageQuery = supabase
      .from("products")
      .select("id, name, slug, category, category_id, base_price, is_active, images, created_at")
      .eq("store_id", storeId)
    if (escapedQuery) {
      pageQuery = pageQuery.or(`name.ilike.%${escapedQuery}%,slug.ilike.%${escapedQuery}%`)
    }
    if (filters.category) {
      pageQuery = pageQuery.eq("category_id", filters.category)
    }
    if (filters.status === "active") {
      pageQuery = pageQuery.eq("is_active", true)
    } else if (filters.status === "draft") {
      pageQuery = pageQuery.eq("is_active", false)
    }
    const { data: pageProducts, error: productsErr } = await pageQuery
      .order("created_at", { ascending: false })
      .range(start, end)
    if (productsErr) throw productsErr

    const pageRows = pageProducts ?? []
    if (pageRows.length === 0) {
      return { rows: [], total, maxStockOnPage: 1 }
    }

    const pageIds = pageRows.map((p) => p.id)
    const { data: variantRows, error: variantsErr } = await supabase
      .from("product_variants")
      .select("product_id, stock_quantity, sku")
      .in("product_id", pageIds)
    if (variantsErr) throw variantsErr

    const stockByProduct = new Map<string, Agg>()
    for (const id of pageIds) {
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

    const rows: ProductDashboardListRow[] = pageRows.map((p) => {
      const agg = stockByProduct.get(p.id) ?? {
        total: 0,
        count: 0,
        firstSku: null,
      }
      const compactId = p.id.replace(/-/g, "").slice(0, 6).toUpperCase()
      const reference_label = agg.firstSku ? `REF: ${agg.firstSku}` : `REF: ${compactId}`

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        category_id: p.category_id,
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

  // Stock-filtered paths still require aggregate stock evaluation per matching product.
  let idQuery = supabase.from("products").select("id").eq("store_id", storeId)
  if (escapedQuery) {
    idQuery = idQuery.or(`name.ilike.%${escapedQuery}%,slug.ilike.%${escapedQuery}%`)
  }
  if (filters.category) {
    idQuery = idQuery.eq("category_id", filters.category)
  }
  if (filters.status === "active") {
    idQuery = idQuery.eq("is_active", true)
  } else if (filters.status === "draft") {
    idQuery = idQuery.eq("is_active", false)
  }
  const { data: idRows, error: idErr } = await idQuery.order("created_at", { ascending: false })
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
  const pageIds = filteredIds.slice(start, start + pageSize)

  if (pageIds.length === 0) {
    return { rows: [], total, maxStockOnPage: 1 }
  }

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, name, slug, category, category_id, base_price, is_active, images, created_at")
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
      category_id: p.category_id,
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
