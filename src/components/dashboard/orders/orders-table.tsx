"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
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
  getOrderStatusColor,
  getOrderStatusLabel,
  normalizeOrderStatus,
} from "@/lib/utils"
import { OrderStatusSelect } from "./order-status-select"

export interface OrderTableRow {
  id: string
  store_id: string
  order_number: string
  status: string
  customer_name: string
  total_mad: number
  created_at: string
}

interface OrdersTableProps {
  orders: OrderTableRow[]
  storeId: string
}

export function OrdersTable({ orders, storeId }: OrdersTableProps) {
  const [rows, setRows] = useState(orders)
  const storeQuery = new URLSearchParams({ store: storeId }).toString()

  useEffect(() => {
    setRows(orders)
  }, [orders])

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
        {rows.map((order) => (
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
                  getOrderStatusColor(order.status)
                )}
                variant="outline"
              >
                {getOrderStatusLabel(order.status)}
              </Badge>
            </TableCell>
            <TableCell>
              {normalizeOrderStatus(order.status) ? (
                <OrderStatusSelect
                  orderId={order.id}
                  storeId={storeId}
                  status={order.status}
                  onStatusUpdated={(nextStatus) => {
                    setRows((prev) =>
                      prev.map((row) =>
                        row.id === order.id ? { ...row, status: nextStatus } : row
                      )
                    )
                  }}
                />
              ) : (
                <span className="text-sm text-muted-foreground">Indisponible</span>
              )}
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

