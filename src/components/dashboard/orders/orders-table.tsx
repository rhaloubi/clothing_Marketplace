"use client"

import Link from "next/link"
import { Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  cn,
  formatDateTime,
  formatPrice,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "@/lib/utils"
import type { OrderStatus } from "@/types"
import { OrderStatusSelect } from "./order-status-select"

export interface OrderTableRow {
  id: string
  store_id: string
  order_number: string
  status: OrderStatus
  customer_name: string
  total_mad: number
  created_at: string
}

interface OrdersTableProps {
  orders: OrderTableRow[]
  storeId: string
}

export function OrdersTable({ orders, storeId }: OrdersTableProps) {
  const storeQuery = new URLSearchParams({ store: storeId }).toString()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Commande</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="w-44">Changer statut</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.order_number}</TableCell>
            <TableCell>{order.customer_name}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatDateTime(order.created_at)}
            </TableCell>
            <TableCell>{formatPrice(order.total_mad)}</TableCell>
            <TableCell>
              <Badge
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  ORDER_STATUS_COLORS[order.status]
                )}
                variant="outline"
              >
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </TableCell>
            <TableCell>
              <OrderStatusSelect
                orderId={order.id}
                storeId={storeId}
                status={order.status}
              />
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/dashboard/orders/${order.id}?${storeQuery}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}
              >
                <Eye className="me-2 h-4 w-4" />
                Voir
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

