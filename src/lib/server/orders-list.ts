import type { SupabaseClient } from "@supabase/supabase-js"
import type { OrderListItem, OrderStatus } from "@/types"

/** YYYY-MM-DD → ISO bounds (UTC). Inclusive end-of-day for `to`. */
export function orderListDateRangeToIsoBounds(
  from?: string,
  to?: string
): { fromIso?: string; toIso?: string } {
  if (!from && !to) return {}
  return {
    fromIso: from ? `${from}T00:00:00.000Z` : undefined,
    toIso: to ? `${to}T23:59:59.999Z` : undefined,
  }
}

/** Raw PostgREST row with embeds (wilaya label + items count). */
export interface RawOrderListRow {
  id: string
  store_id: string
  order_number: string
  status: string
  customer_name: string
  customer_phone: string
  total_mad: number
  created_at: string
  /** Many-to-one embed: object or single-element array depending on client inference. */
  wilayas: { name_fr: string } | { name_fr: string }[] | null
  order_items: { count: number | string }[] | null
}

function parseItemsCount(raw: { count: number | string }[] | null | undefined): number {
  const n = raw?.[0]?.count
  if (typeof n === "number" && !Number.isNaN(n)) return n
  if (typeof n === "string") {
    const parsed = Number.parseInt(n, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function wilayaNameFromEmbed(
  w: RawOrderListRow["wilayas"]
): string | null {
  if (!w) return null
  const row = Array.isArray(w) ? w[0] : w
  return row?.name_fr ?? null
}

export function mapRawOrderListRow(row: RawOrderListRow): OrderListItem {
  const items_count = parseItemsCount(row.order_items)
  return {
    id: row.id,
    store_id: row.store_id,
    order_number: row.order_number,
    status: row.status as OrderStatus,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    total_mad: row.total_mad,
    created_at: row.created_at,
    wilaya_name: wilayaNameFromEmbed(row.wilayas),
    items_count,
  }
}

export interface FetchOrdersListParams {
  storeId: string
  status?: OrderStatus
  searchText: string
  from?: string
  to?: string
  offset: number
  limit: number
}

/**
 * Dashboard / GET /api/orders list query.
 * Pagination: offset + limit today; cursor (created_at + id) can be added without changing the mapped shape.
 */
export async function fetchOrdersList(
  supabase: SupabaseClient,
  params: FetchOrdersListParams
): Promise<{ orders: OrderListItem[]; total: number; error: Error | null }> {
  const { fromIso, toIso } = orderListDateRangeToIsoBounds(params.from, params.to)

  let q = supabase
    .from("orders")
    .select(
      `
      id,
      store_id,
      order_number,
      status,
      customer_name,
      customer_phone,
      total_mad,
      created_at,
      wilayas(name_fr),
      order_items(count)
    `,
      { count: "exact" }
    )
    .eq("store_id", params.storeId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1)

  if (params.status) {
    q = q.eq("status", params.status)
  }

  if (fromIso) {
    q = q.gte("created_at", fromIso)
  }
  if (toIso) {
    q = q.lte("created_at", toIso)
  }

  const text = params.searchText.trim().slice(0, 200)
  if (text.length > 0) {
    const escaped = text.replaceAll(",", "\\,")
    q = q.or(
      `order_number.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%`
    )
  }

  const { data, error, count } = await q

  if (error) {
    return { orders: [], total: 0, error: new Error(error.message) }
  }

  const rows = (data ?? []) as RawOrderListRow[]
  return {
    orders: rows.map(mapRawOrderListRow),
    total: count ?? 0,
    error: null,
  }
}
