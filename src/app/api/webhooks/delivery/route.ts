import { withWebhook, withRateLimit, ok, fail, NotFoundError, ValidationError } from "@/lib/api"
import { createAdminClient } from "@/lib/supabase/admin"
import { deliveryStatusUpdateSchema } from "@/lib/validations"
import type { OrderStatus } from "@/types"
import {
  assertOrderStatusTransition,
  orderStatusTimestampField,
} from "@/lib/server/order-status"

export const POST = withRateLimit("webhook")(
  withWebhook("delivery")(async (_req, { rawBody }) => {
    let body: unknown
    try {
      body = JSON.parse(rawBody) as unknown
    } catch {
      return fail(new ValidationError("JSON invalide."))
    }

    const parsed = deliveryStatusUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const admin = createAdminClient()
    const { data: order, error: loadErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", parsed.data.order_id)
      .maybeSingle()

    if (loadErr) return fail(loadErr)
    if (!order) return fail(new NotFoundError("Commande"))

    const current = order.status as OrderStatus
    const next = parsed.data.status

    try {
      assertOrderStatusTransition(current, next)
    } catch (e) {
      return fail(e)
    }

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = {
      status: next,
      updated_at: now,
    }

    const col = orderStatusTimestampField(next)
    if (col) patch[col] = now

    if (parsed.data.tracking_number !== undefined) {
      patch.tracking_number = parsed.data.tracking_number
    }

    const { data: updated, error: upErr } = await admin
      .from("orders")
      .update(patch)
      .eq("id", order.id)
      .select()
      .single()

    if (upErr) return fail(upErr)
    return ok({ order: updated })
  })
)
