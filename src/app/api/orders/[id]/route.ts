import { type NextRequest } from "next/server"
import {
  withAuth,
  withRateLimit,
  ok,
  fail,
  NotFoundError,
  ValidationError,
  BadRequestError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { patchOrderSchema } from "@/lib/validations"
import type { OrderStatus } from "@/types"
import {
  assertOrderStatusTransition,
  orderStatusTimestampField,
} from "@/lib/server/order-status"

export const GET = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (_req, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant commande requis."))
    const supabase = await createClient()

    const { data: order, error } = await supabase
      .from("orders")
      .select("*, wilayas(*), order_items(*)")
      .eq("id", id)
      .maybeSingle()

    if (error) return fail(error)
    if (!order) return fail(new NotFoundError("Commande"))

    await assertStoreOwnership(supabase, order.store_id, auth.user.id)

    return ok(order)
  })
)

export const PATCH = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (req: NextRequest, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant commande requis."))
    const body = (await req.json()) as unknown
    const parsed = patchOrderSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()
    const { data: order, error: loadErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (loadErr) return fail(loadErr)
    if (!order) return fail(new NotFoundError("Commande"))

    await assertStoreOwnership(supabase, order.store_id, auth.user.id)

    const now = new Date().toISOString()
    const currentStatus = order.status as OrderStatus
    const patch: Record<string, unknown> = {}

    if (parsed.data.status !== undefined && parsed.data.status !== currentStatus) {
      assertOrderStatusTransition(currentStatus, parsed.data.status)
      patch.status = parsed.data.status
      const col = orderStatusTimestampField(parsed.data.status)
      if (col) patch[col] = now
    }

    if (parsed.data.tracking_number !== undefined) {
      patch.tracking_number = parsed.data.tracking_number
    }
    if (parsed.data.shipping_provider_id !== undefined) {
      patch.shipping_provider_id = parsed.data.shipping_provider_id
    }

    if (Object.keys(patch).length === 0) {
      const { data: full } = await supabase
        .from("orders")
        .select("*, wilayas(*), order_items(*)")
        .eq("id", id)
        .single()
      return ok(full)
    }

    patch.updated_at = now

    const { data: updated, error: upErr } = await supabase
      .from("orders")
      .update(patch)
      .eq("id", id)
      .select("*, wilayas(*), order_items(*)")
      .single()

    if (upErr) return fail(upErr)
    return ok(updated)
  })
)
