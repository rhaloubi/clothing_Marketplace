import { type NextRequest } from "next/server"
import {
  withAuth,
  withRateLimit,
  ok,
  fail,
  BadRequestError,
  ValidationError,
  ConflictError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { shippingZoneSchema } from "@/lib/validations"
import { assertStoreOwnership } from "@/lib/utils"
import type { Database } from "@/types/database.types"

type ZoneInsert = Database["public"]["Tables"]["shipping_zones"]["Insert"]

export const GET = withAuth(
  withRateLimit("api", { keyBy: "user" })(async (_req, { auth, params }) => {
    const storeId = params.id
    if (!storeId) return fail(new BadRequestError("Identifiant boutique requis."))

    const supabase = await createClient()
    try {
      await assertStoreOwnership(supabase, storeId, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { data, error } = await supabase
      .from("shipping_zones")
      .select("*, wilayas (*)")
      .eq("store_id", storeId)
      .order("wilaya_id", { ascending: true })

    if (error) return fail(error)
    return ok(data ?? [])
  })
)

export const POST = withAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth, params }) => {
    const storeId = params.id
    if (!storeId) return fail(new BadRequestError("Identifiant boutique requis."))

    const body = (await req.json()) as unknown
    const parsed = shippingZoneSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()
    try {
      await assertStoreOwnership(supabase, storeId, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const row: ZoneInsert = {
      store_id: storeId,
      wilaya_id: parsed.data.wilaya_id,
      provider_id: parsed.data.provider_id ?? null,
      price_mad: parsed.data.price_mad,
      free_shipping_threshold: parsed.data.free_shipping_threshold ?? null,
      estimated_days_min: parsed.data.estimated_days_min,
      estimated_days_max: parsed.data.estimated_days_max,
      is_active: parsed.data.is_active,
    }

    const { data, error } = await supabase.from("shipping_zones").insert(row).select("*, wilayas (*)").single()

    if (error) {
      if (error.code === "23505") {
        return fail(new ConflictError("Une zone existe déjà pour cette wilaya."))
      }
      return fail(error)
    }

    return ok(data, 201)
  })
)
