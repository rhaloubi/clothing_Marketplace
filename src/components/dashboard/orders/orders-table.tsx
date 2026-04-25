"use client"

import { useRouter } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import {
  dashboardTableBodyRowClass,
  dashboardTableHeadClass,
  dashboardTableHeaderRowClass,
} from "@/components/dashboard/dashboard-page"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/lib/utils"

export interface OrderTableRow {
  id: string
  store_id: string
  order_number: string
  status: string
  customer_name: string
  customer_phone: string
  wilaya_name?: string | null
  total_mad: number
  created_at: string
}

interface OrdersTableProps {
  orders: OrderTableRow[]
  storeId: string
}

export function OrdersTable({ orders, storeId }: OrdersTableProps) {
  const router = useRouter()
  const storeQuery = new URLSearchParams({ store: storeId }).toString()

  return (
    <Table>
      <TableHeader>
        <TableRow className={dashboardTableHeaderRowClass}>
          <TableHead className={dashboardTableHeadClass}>Date</TableHead>
          <TableHead className={dashboardTableHeadClass}>Commande</TableHead>
          <TableHead className={dashboardTableHeadClass}>Client</TableHead>
          <TableHead className={dashboardTableHeadClass}>Total</TableHead>
          <TableHead className={dashboardTableHeadClass}>Statut</TableHead>
          <TableHead className={cn(dashboardTableHeadClass, "text-right")}>
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id} className={dashboardTableBodyRowClass}>
            <TableCell className="px-3 py-3 text-sm text-stripe-body">
              {formatDateTime(order.created_at)}
            </TableCell>
            <TableCell className="px-3 py-3 font-semibold text-stripe-purple">
              {order.order_number}
            </TableCell>
            <TableCell className="px-3 py-3">
              <div className="flex flex-col">
                <span className="font-medium text-stripe-heading">{order.customer_name}</span>
                <span className="text-xs text-stripe-body">
                  {order.wilaya_name ?? order.customer_phone}
                </span>
              </div>
            </TableCell>
            <TableCell className="px-3 py-3 text-stripe-heading tabular-nums-stripe">
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
            <TableCell className="px-3 py-3 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-md text-stripe-label transition-colors hover:bg-stripe-canvas hover:text-stripe-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
                  )}
                  aria-label={`Actions pour ${order.order_number}`}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/orders/${order.id}?${storeQuery}`)}
                  >
                    Voir le détail
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

