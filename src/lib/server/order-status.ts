import type { OrderStatus } from "@/types"
import { ValidationError } from "@/lib/api/errors"

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: [],
  returned: [],
  cancelled: [],
}

/**
 * Enforces the COD order state machine (no skips, no backwards).
 */
export function assertOrderStatusTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return
  const next = ALLOWED[from]
  if (!next?.includes(to)) {
    throw new ValidationError(
      `Transition de statut invalide : « ${from} » → « ${to} ».`
    )
  }
}

export function orderStatusTimestampField(status: OrderStatus):
  | "confirmed_at"
  | "shipped_at"
  | "delivered_at"
  | "returned_at"
  | "cancelled_at"
  | null {
  switch (status) {
    case "confirmed":
      return "confirmed_at"
    case "shipped":
      return "shipped_at"
    case "delivered":
      return "delivered_at"
    case "returned":
      return "returned_at"
    case "cancelled":
      return "cancelled_at"
    default:
      return null
  }
}
