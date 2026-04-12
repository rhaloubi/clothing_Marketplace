"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OrderStatusSelect } from "./order-status-select"
import { cn, getOrderStatusColor, getOrderStatusLabel } from "@/lib/utils"

interface OrderDetailStatusCardProps {
  orderId: string
  storeId: string
  status: string
  canEdit: boolean
}

export function OrderDetailStatusCard({
  orderId,
  storeId,
  status,
  canEdit,
}: OrderDetailStatusCardProps) {
  const [open, setOpen] = useState(false)
  const label = getOrderStatusLabel(status)

  return (
    <section className="rounded-md border border-stripe-border bg-white p-5 shadow-stripe-card">
      <p className="text-xs font-medium uppercase tracking-wide text-stripe-body">
        Statut
      </p>
      <div className="mt-3">
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            getOrderStatusColor(status)
          )}
        >
          {label}
        </Badge>
      </div>
      {canEdit ? (
        <>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-11 w-full gap-2 rounded-md border-stripe-purple-soft text-stripe-purple hover:bg-stripe-purple-muted/40"
            onClick={() => setOpen(true)}
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            Changer le statut
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Changer le statut</DialogTitle>
              </DialogHeader>
              <OrderStatusSelect
                orderId={orderId}
                storeId={storeId}
                status={status}
                refreshOnSuccess
                onStatusUpdated={() => setOpen(false)}
                triggerClassName="w-full min-h-11"
              />
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <p className="mt-3 text-sm text-stripe-body">
          Ce statut ne peut pas être modifié ici.
        </p>
      )}
    </section>
  )
}
