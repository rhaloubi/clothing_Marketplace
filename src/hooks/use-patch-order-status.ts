"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import { toast } from "sonner"
import type { Order, OrderStatus } from "@/types"

interface PatchPayload {
  orderId: string
  status: OrderStatus
  storeId: string
}

/**
 * Patches an order's status, invalidates the orders list + the specific order,
 * and shows toast feedback.
 */
export function usePatchOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, status }: PatchPayload) => {
      return apiFetch<Order>(`/api/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: (_, { orderId, storeId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(storeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) })
      toast.success("Statut mis à jour")
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
