import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { OrderStatusSelect } from "@/components/dashboard/orders/order-status-select"
import type { OrderItem } from "@/types"

type PageParams = Promise<{ id: string }>
type SearchParams = Promise<{ store?: string }>

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: PageParams
  searchParams: SearchParams
}) {
  const { id } = await params
  const { store } = await searchParams
  const storeId = parseStoreId(store)

  if (!storeId) {
    redirect("/dashboard")
  }

  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, wilayas(*), order_items(*)")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle()

  if (error || !order) notFound()

  const items = (order.order_items ?? []) as OrderItem[]
  const orderStatus = String(order.status)
  const canEditStatus = normalizeOrderStatus(orderStatus) !== null

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href={`/dashboard/orders?store=${storeId}`}
            className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="me-1 h-4 w-4" />
            Retour aux commandes
          </Link>
          <h1 className="text-2xl font-semibold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            Creee le {formatDateTime(order.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("rounded-full px-2.5 py-1", getOrderStatusColor(orderStatus))}
          >
            {getOrderStatusLabel(orderStatus)}
          </Badge>
          {canEditStatus ? (
            <OrderStatusSelect
              orderId={order.id}
              storeId={storeId}
              status={orderStatus}
              refreshOnSuccess
            />
          ) : (
            <span className="text-sm text-muted-foreground">Statut non editable</span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Articles</CardTitle>
            <CardDescription>Snapshot des produits au moment de la commande.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead>Qte</TableHead>
                  <TableHead>Prix unitaire</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.variant_label}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatPrice(item.unit_price_mad)}</TableCell>
                    <TableCell>{formatPrice(item.total_price_mad)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Nom: </span>
                {order.customer_name}
              </p>
              <p>
                <span className="text-muted-foreground">Telephone: </span>
                {order.customer_phone}
              </p>
              <p>
                <span className="text-muted-foreground">Adresse: </span>
                {order.customer_address}
              </p>
              <p>
                <span className="text-muted-foreground">Ville: </span>
                {order.customer_city}
              </p>
              {order.customer_notes ? (
                <p>
                  <span className="text-muted-foreground">Note: </span>
                  {order.customer_notes}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totaux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatPrice(order.subtotal_mad)}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Livraison</span>
                <span>{formatPrice(order.shipping_cost_mad)}</span>
              </p>
              <p className="flex items-center justify-between border-t pt-2 font-medium">
                <span>Total</span>
                <span>{formatPrice(order.total_mad)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

