import { type NextRequest } from "next/server"
import {
  withRateLimit,
  ok,
  fail,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateOrderNumber } from "@/lib/utils"
import { storefrontCheckoutSchema } from "@/lib/validations"
import {
  fetchActiveStoreBySlug,
  getShippingZonePrice,
  restoreVariantStock,
} from "@/lib/server/storefront"

type ProductEmbed = {
  name: string
  images: unknown
  store_id: string
  is_active: boolean
  base_price: number
}

type VariantRow = {
  id: string
  sku: string | null
  price_override: number | null
  stock_quantity: number
  product_id: string
  is_active: boolean
  products: ProductEmbed
}

export const POST = withRateLimit("checkout")(
  async (req: NextRequest, ctx: Record<string, unknown>) => {
    const { tenant } = await (ctx.params as Promise<{ tenant: string }>)
    const body = (await req.json()) as unknown
    const parsed = storefrontCheckoutSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const qtyByVariant = new Map<string, number>()
    for (const it of parsed.data.items) {
      qtyByVariant.set(it.variant_id, (qtyByVariant.get(it.variant_id) ?? 0) + it.quantity)
    }

    const supabase = await createClient()
    const store = await fetchActiveStoreBySlug(supabase, tenant)
    if (!store) return fail(new NotFoundError("Boutique"))

    const zone = await getShippingZonePrice(supabase, store.id, parsed.data.wilaya_id)
    if (!zone) {
      return fail(new ValidationError("Livraison non disponible pour cette wilaya."))
    }

    const variantIds = [...qtyByVariant.keys()]
    const { data: vrows, error: vErr } = await supabase
      .from("product_variants")
      .select(
        `
        id,
        sku,
        price_override,
        stock_quantity,
        product_id,
        is_active,
        products!inner ( name, images, store_id, is_active, base_price )
      `
      )
      .in("id", variantIds)

    if (vErr) return fail(vErr)
    if (vrows?.length !== variantIds.length) {
      return fail(new NotFoundError("Variante"))
    }

    const rows = vrows as unknown as VariantRow[]
    for (const v of rows) {
      if (v.products.store_id !== store.id || !v.products.is_active || !v.is_active) {
        return fail(new ValidationError("Un ou plusieurs articles ne sont plus disponibles."))
      }
      const need = qtyByVariant.get(v.id) ?? 0
      if (v.stock_quantity < need) {
        return fail(new ConflictError("Stock insuffisant pour un ou plusieurs articles."))
      }
    }

    const lineSnapshots: {
      variant_id: string
      product_id: string
      product_name: string
      variant_label: string
      product_image: string | null
      quantity: number
      unit_price_mad: number
      total_price_mad: number
    }[] = []

    let subtotal_mad = 0
    for (const v of rows) {
      const q = qtyByVariant.get(v.id) ?? 0
      const unit = v.price_override ?? v.products.base_price
      const imgs = v.products.images
      const firstImage =
        Array.isArray(imgs) && typeof imgs[0] === "string" ? imgs[0] : null
      const lineTotal = unit * q
      subtotal_mad += lineTotal
      lineSnapshots.push({
        variant_id: v.id,
        product_id: v.product_id,
        product_name: v.products.name,
        variant_label: v.sku?.trim() ? v.sku.trim() : v.products.name,
        product_image: firstImage,
        quantity: q,
        unit_price_mad: unit,
        total_price_mad: lineTotal,
      })
    }

    let shipping_cost_mad = zone.price_mad
    if (
      zone.free_shipping_threshold != null &&
      subtotal_mad >= zone.free_shipping_threshold
    ) {
      shipping_cost_mad = 0
    }

    const total_mad = subtotal_mad + shipping_cost_mad
    const admin = createAdminClient()

    const { count, error: cErr } = await admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("store_id", store.id)

    if (cErr) return fail(cErr)
    const order_number = generateOrderNumber(count ?? 0)

    const decremented: { id: string; qty: number }[] = []

    try {
      for (const [variantId, qty] of qtyByVariant) {
        const { error: dErr } = await admin.rpc("decrement_stock", {
          p_variant_id: variantId,
          p_quantity: qty,
        })
        if (dErr) {
          throw dErr
        }
        decremented.push({ id: variantId, qty })
      }

      const { data: order, error: oErr } = await admin
        .from("orders")
        .insert({
          store_id: store.id,
          order_number,
          status: "pending",
          customer_name: parsed.data.customer_name,
          customer_phone: parsed.data.customer_phone,
          customer_address: parsed.data.customer_address,
          customer_city: parsed.data.customer_city,
          wilaya_id: parsed.data.wilaya_id,
          customer_notes: parsed.data.customer_notes ?? null,
          subtotal_mad,
          shipping_cost_mad,
          total_mad,
          shipping_provider_id: zone.provider_id,
        })
        .select("id")
        .single()

      if (oErr || !order) {
        throw oErr ?? new Error("insert order")
      }

      const { error: iErr } = await admin.from("order_items").insert(
        lineSnapshots.map((l) => ({
          order_id: order.id,
          product_id: l.product_id,
          variant_id: l.variant_id,
          product_name: l.product_name,
          variant_label: l.variant_label,
          product_image: l.product_image,
          quantity: l.quantity,
          unit_price_mad: l.unit_price_mad,
          total_price_mad: l.total_price_mad,
        }))
      )

      if (iErr) {
        await admin.from("orders").delete().eq("id", order.id)
        throw iErr
      }

      return ok(
        {
          order_id: order.id,
          order_number,
          total_mad,
          subtotal_mad,
          shipping_cost_mad,
        },
        201
      )
    } catch (e) {
      for (const d of decremented) {
        await restoreVariantStock(admin, d.id, d.qty)
      }
      const msg = typeof e === "object" && e !== null && "message" in e ? String((e as Error).message) : ""
      if (msg.includes("insufficient_stock")) {
        return fail(new ConflictError("Stock insuffisant pour un ou plusieurs articles."))
      }
      return fail(e)
    }
  }
)
