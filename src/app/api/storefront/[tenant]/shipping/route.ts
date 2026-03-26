import { type NextRequest } from "next/server"
import { withRateLimit, ok, fail, NotFoundError, ValidationError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { fetchActiveStoreBySlug, getShippingZonePrice } from "@/lib/server/storefront"

export const GET = withRateLimit("api")(
  async (req: NextRequest, ctx: Record<string, unknown>) => {
    const { tenant } = await (ctx.params as Promise<{ tenant: string }>)
    const raw = req.nextUrl.searchParams.get("wilaya_id")
    const wilayaId = raw === null ? NaN : Number(raw)
    if (!Number.isInteger(wilayaId) || wilayaId < 1 || wilayaId > 12) {
      return fail(new ValidationError("wilaya_id invalide (1–12)."))
    }

    const supabase = await createClient()
    const store = await fetchActiveStoreBySlug(supabase, tenant)
    if (!store) return fail(new NotFoundError("Boutique"))

    try {
      const zone = await getShippingZonePrice(supabase, store.id, wilayaId)
      if (!zone) {
        return fail(new NotFoundError("Livraison"))
      }
      return ok({
        store_id: store.id,
        wilaya_id: wilayaId,
        price_mad: zone.price_mad,
        free_shipping_threshold: zone.free_shipping_threshold,
        estimated_days_min: zone.estimated_days_min,
        estimated_days_max: zone.estimated_days_max,
        provider_id: zone.provider_id,
      })
    } catch (e) {
      return fail(e)
    }
  }
)
