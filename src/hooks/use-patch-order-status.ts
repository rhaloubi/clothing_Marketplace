"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import type { Order, OrderStatus } from "@/types"

interface PatchPayload {
  orderId: string
  status: OrderStatus
  storeId: string
}

interface UsePatchOrderStatusOptions {
  /** When true, refresh server components after success (detail page, etc.). */
  refreshRouterOnSuccess?: boolean
}

/**
 * PATCH order status via `/api/orders/[id]`.
 * List rows update via `onStatusUpdated` local state; do not rely on Query cache for lists (see dashboard-data-fetching rule).
 */
export function usePatchOrderStatus(options?: UsePatchOrderStatusOptions) {
  const router = useRouter()
  const refreshRouterOnSuccess = options?.refreshRouterOnSuccess ?? false

  return useMutation({
    mutationFn: async ({ orderId, status }: PatchPayload) => {
      return apiFetch<Order>(`/api/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: () => {
      toast.success("Statut mis à jour")
      if (refreshRouterOnSuccess) {
        router.refresh()
      }
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        if (err.code === "BAD_REQUEST") {
          toast.error("Transition de statut invalide.")
        } else if (err.code === "FORBIDDEN") {
          toast.error("Vous n'avez pas accès à cette commande.")
        } else {
          toast.error("Impossible de mettre à jour le statut.")
        }
      }
    },
  })
}
