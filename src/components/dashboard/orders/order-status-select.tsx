"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePatchOrderStatus } from "@/hooks"
import type { OrderStatus } from "@/types"

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmée" },
  { value: "shipped", label: "Expédiée" },
  { value: "delivered", label: "Livrée" },
  { value: "returned", label: "Retournée" },
  { value: "cancelled", label: "Annulée" },
]

interface OrderStatusSelectProps {
  orderId: string
  storeId: string
  status: OrderStatus
}

export function OrderStatusSelect({
  orderId,
  storeId,
  status,
}: OrderStatusSelectProps) {
  const router = useRouter()
  const patchOrderStatus = usePatchOrderStatus()

  return (
    <Select
      value={status}
      onValueChange={(nextValue) => {
        if (!nextValue) return
        const isKnownStatus = STATUS_OPTIONS.some((option) => option.value === nextValue)
        if (!isKnownStatus) return
        const nextStatus = nextValue
        if (nextStatus === status) return
        patchOrderStatus.mutate(
          { orderId, status: nextStatus, storeId },
          {
            onSuccess: () => {
              router.refresh()
            },
          }
        )
      }}
      disabled={patchOrderStatus.isPending}
    >
      <SelectTrigger size="sm" className="min-w-36 rounded-lg bg-white">
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

