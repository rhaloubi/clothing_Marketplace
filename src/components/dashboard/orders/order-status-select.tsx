"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { usePatchOrderStatus } from "@/hooks"
import { ORDER_STATUS_LABELS, normalizeOrderStatus } from "@/lib/utils"
import type { OrderStatus } from "@/types"

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: ORDER_STATUS_LABELS.pending },
  { value: "confirmed", label: ORDER_STATUS_LABELS.confirmed },
  { value: "shipped", label: ORDER_STATUS_LABELS.shipped },
  { value: "delivered", label: ORDER_STATUS_LABELS.delivered },
  { value: "returned", label: ORDER_STATUS_LABELS.returned },
  { value: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
]

interface OrderStatusSelectProps {
  orderId: string
  storeId: string
  status: string
  onStatusUpdated?: (status: OrderStatus) => void
  refreshOnSuccess?: boolean
}

export function OrderStatusSelect({
  orderId,
  storeId,
  status,
  onStatusUpdated,
  refreshOnSuccess = false,
}: OrderStatusSelectProps) {
  const patchOrderStatus = usePatchOrderStatus({
    refreshRouterOnSuccess: refreshOnSuccess,
  })
  const normalizedStatus = normalizeOrderStatus(status) ?? "pending"

  return (
    <Select
      value={normalizedStatus}
      onValueChange={(nextValue) => {
        if (!nextValue) return
        const nextStatus = normalizeOrderStatus(nextValue)
        if (!nextStatus) return
        if (nextStatus === normalizedStatus) return
        patchOrderStatus.mutate(
          { orderId, status: nextStatus, storeId },
          {
            onSuccess: () => {
              onStatusUpdated?.(nextStatus)
            },
          }
        )
      }}
      disabled={patchOrderStatus.isPending}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          "min-w-36 rounded-[4px] border-stripe-border bg-white text-stripe-heading shadow-sm",
          "focus-visible:border-stripe-purple focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

