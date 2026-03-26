import { type NextRequest } from "next/server"
import {
  withAuth,
  withRateLimit,
  ok,
  fail,
  noContent,
  BadRequestError,
  ValidationError,
  NotFoundError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import type { ZodIssue } from "zod"
import { updateShippingZoneSchema } from "@/lib/validations"
import { assertStoreOwnership } from "@/lib/utils"
import { assertShippingZoneInStore } from "@/lib/server/shipping"
import type { Database } from "@/types/database.types"

type ZoneUpdate = Database["public"]["Tables"]["shipping_zones"]["Update"]

export const PATCH = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (req: NextRequest, { auth, params }) => {
    const storeId = params.id
    const zoneId = params.zoneId
    if (!storeId || !zoneId) {
      return fail(new BadRequestError("Identifiants boutique et zone requis."))
    }

    const body = (await req.json()) as unknown
    const parsed = updateShippingZoneSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(
            parsed.error.errors.map((e: ZodIssue) => [e.path.join("."), e.message])
          )
        )
      )
    }

    const supabase = await createClient()
    try {
      await assertStoreOwnership(supabase, storeId, auth.user.id)
      await assertShippingZoneInStore(supabase, zoneId, storeId)
    } catch (err) {
      return fail(err)
    }

    const patch = parsed.data
    const row: ZoneUpdate = {}
    if (patch.wilaya_id !== undefined) row.wilaya_id = patch.wilaya_id
    if (patch.provider_id !== undefined) row.provider_id = patch.provider_id
    if (patch.price_mad !== undefined) row.price_mad = patch.price_mad
    if (patch.free_shipping_threshold !== undefined) row.free_shipping_threshold = patch.free_shipping_threshold
    if (patch.estimated_days_min !== undefined) row.estimated_days_min = patch.estimated_days_min
    if (patch.estimated_days_max !== undefined) row.estimated_days_max = patch.estimated_days_max
    if (patch.is_active !== undefined) row.is_active = patch.is_active

    if (Object.keys(row).length === 0) {
      const { data } = await supabase
        .from("shipping_zones")
        .select("*, wilayas (*)")
        .eq("id", zoneId)
        .single()
      if (!data) return fail(new NotFoundError("Zone de livraison"))
      return ok(data)
    }

    const { data, error } = await supabase
      .from("shipping_zones")
      .update(row)
      .eq("id", zoneId)
      .select("*, wilayas (*)")
      .single()

    if (error) return fail(error)
    return ok(data)
  })
)

export const DELETE = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (_req, { auth, params }) => {
    const storeId = params.id
    const zoneId = params.zoneId
    if (!storeId || !zoneId) {
      return fail(new BadRequestError("Identifiants boutique et zone requis."))
    }

    const supabase = await createClient()
    try {
      await assertStoreOwnership(supabase, storeId, auth.user.id)
      await assertShippingZoneInStore(supabase, zoneId, storeId)
    } catch (err) {
      return fail(err)
    }

    const { error } = await supabase.from("shipping_zones").delete().eq("id", zoneId)
    if (error) return fail(error)
    return noContent()
  })
)
