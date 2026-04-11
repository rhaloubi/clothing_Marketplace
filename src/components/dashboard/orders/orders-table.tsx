"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Eye } from "lucide-react"
import {
  dashboardLinkOutlineSm,
  dashboardTableBodyRowClass,
  dashboardTableHeadClass,
  dashboardTableHeaderRowClass,
} from "@/components/dashboard/dashboard-page"
import { Badge } from "@/components/ui/badge"
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
        <TableRow className={dashboardTableHeaderRowClass}>
          <TableHead className={dashboardTableHeadClass}>Commande</TableHead>
          <TableHead className={dashboardTableHeadClass}>Client</TableHead>
          <TableHead className={dashboardTableHeadClass}>Date</TableHead>
          <TableHead className={dashboardTableHeadClass}>Total</TableHead>
          <TableHead className={dashboardTableHeadClass}>Statut</TableHead>
          <TableHead className={cn(dashboardTableHeadClass, "w-44")}>
            Changer statut
          </TableHead>
          <TableHead className={cn(dashboardTableHeadClass, "text-right")}>
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((order) => (
          <TableRow key={order.id} className={dashboardTableBodyRowClass}>
            <TableCell className="px-3 py-3 font-medium text-zinc-900">
              {order.order_number}
            </TableCell>
            <TableCell className="px-3 py-3 text-zinc-800">{order.customer_name}</TableCell>
            <TableCell className="px-3 py-3 text-zinc-500">
              {formatDateTime(order.created_at)}
            </TableCell>
            <TableCell className="px-3 py-3 text-zinc-800">
              {formatPrice(order.total_mad)}
            </TableCell>
            <TableCell className="px-3 py-3">
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
            <TableCell className="px-3 py-3">
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
                <span className="text-sm text-zinc-500">Indisponible</span>
              )}
            </TableCell>
            <TableCell className="px-3 py-3 text-right">
              <Link
                href={`/dashboard/orders/${order.id}?${storeQuery}`}
                className={cn(dashboardLinkOutlineSm, "inline-flex gap-2")}
              >
                <Eye className="h-4 w-4 shrink-0" aria-hidden />
                Voir
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

