import { type NextRequest } from "next/server"
import { withRateLimit, ok, fail, ValidationError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { trackAnalyticsEventSchema } from "@/lib/validations"

/**
 * Fire-and-forget storefront tracking (anon — RLS allows insert for active stores).
 */
export const POST = withRateLimit("analytics")(async (req: NextRequest) => {
  const body = (await req.json()) as unknown
  const parsed = trackAnalyticsEventSchema.safeParse(body)
  if (!parsed.success) {
    return fail(
      new ValidationError(
        parsed.error.errors[0]?.message ?? "Invalide",
        Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
      )
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.from("analytics_events").insert({
    store_id: parsed.data.store_id,
    event_type: parsed.data.event_type,
    product_id: parsed.data.product_id ?? null,
    order_id: parsed.data.order_id ?? null,
    session_id: parsed.data.session_id ?? null,
    wilaya_id: parsed.data.wilaya_id ?? null,
    referrer: parsed.data.referrer ?? null,
    utm_source: parsed.data.utm_source ?? null,
    utm_medium: parsed.data.utm_medium ?? null,
    utm_campaign: parsed.data.utm_campaign ?? null,
    device_type: parsed.data.device_type ?? null,
  })

  if (error) return fail(error)
  return ok({ recorded: true }, 201)
})
