import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight, MapPin, Package, Phone, Printer } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import { Button } from "@/components/ui/button"
import { OrderDetailStatusCard } from "@/components/dashboard/orders/order-detail-status-card"
import { OrderLogisticsTimeline } from "@/components/dashboard/orders/order-logistics-timeline"
import {
  formatPrice,
  normalizeOrderStatus,
} from "@/lib/utils"
import { toWhatsAppRecipientDigits } from "@/lib/whatsapp"
import { enrichOrderItemsPrimaryImages } from "@/lib/server/order-items-display"
import type { OrderItem } from "@/types"

type PageParams = Promise<{ id: string }>
type SearchParams = Promise<{ store?: string }>

function wilayaNameFr(w: unknown): string | null {
  if (!w) return null
  if (Array.isArray(w)) {
    const row = w[0] as { name_fr?: string } | undefined
    return row?.name_fr ?? null
  }
  if (typeof w === "object" && w !== null && "name_fr" in w) {
    return String((w as { name_fr: string }).name_fr)
  }
  return null
}

function formatPassedAt(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}

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

  const items = await enrichOrderItemsPrimaryImages(
    supabase,
    (order.order_items ?? []) as OrderItem[]
  )
  const orderStatus = String(order.status)
  const canEditStatus = normalizeOrderStatus(orderStatus) !== null
  const orderRef = order.order_number.startsWith("#")
    ? order.order_number
    : `#${order.order_number}`
  const wilayaLabel = wilayaNameFr(order.wilayas)
  const locationLine = [wilayaLabel, order.customer_city]
    .filter(Boolean)
    .join(" · ")
  const waDigits = toWhatsAppRecipientDigits(order.customer_phone)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <nav
            aria-label="Fil d'Ariane"
            className="flex flex-wrap items-center gap-1 text-xs font-medium uppercase tracking-wide text-stripe-body"
          >
            <Link
              href={`/dashboard/orders?store=${storeId}`}
              className="hover:text-stripe-heading"
            >
              Commandes
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            <span className="text-stripe-label">Commande {orderRef}</span>
          </nav>
          <h1 className="text-2xl font-medium tracking-tight text-stripe-heading">
            Détails de la commande
          </h1>
          <p className="text-sm text-stripe-body">
            Passée le {formatPassedAt(order.created_at)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 gap-2 rounded-md border-stripe-border bg-white text-stripe-heading shadow-sm"
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_min(100%,320px)] lg:items-start">
        <section className="rounded-md border border-stripe-border bg-white p-5 shadow-stripe-card lg:p-6">
          <h2 className="text-base font-medium text-stripe-heading">
            Articles commandés
          </h2>
          <div className="mt-4">
            {items.length === 0 ? (
              <p className="text-sm text-stripe-body">Aucun article.</p>
            ) : (
              items.map((item, idx) => (
                <div
                  key={item.id}
                  className={
                    idx > 0 ? "border-t border-stripe-border pt-5 mt-5" : ""
                  }
                >
                  <div className="flex gap-4">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-stripe-canvas">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt=""
                          width={56}
                          height={56}
                          className="size-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-stripe-body/50">
                          <Package className="h-6 w-6" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stripe-heading">
                        {item.product_name}
                      </p>
                      {item.variant_label ? (
                        <p className="mt-0.5 text-sm text-stripe-body">
                          {item.variant_label}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                        <span className="font-medium tabular-nums-stripe text-stripe-heading">
                          {formatPrice(item.unit_price_mad)}
                        </span>
                        <span className="text-stripe-body">
                          Qté&nbsp;: {item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex justify-end border-t border-stripe-border pt-5">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-stripe-heading">
                <span className="text-stripe-body">Sous-total</span>
                <span className="tabular-nums-stripe">
                  {formatPrice(order.subtotal_mad)}
                </span>
              </div>
              <div className="flex justify-between text-stripe-heading">
                <span className="text-stripe-body">Frais de livraison</span>
                <span className="tabular-nums-stripe">
                  {formatPrice(order.shipping_cost_mad)}
                </span>
              </div>
              <div className="flex justify-between border-t border-stripe-border pt-3 text-lg font-semibold text-stripe-purple">
                <span>Total</span>
                <span className="tabular-nums-stripe">
                  {formatPrice(order.total_mad)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <OrderDetailStatusCard
            orderId={order.id}
            storeId={storeId}
            status={orderStatus}
            canEdit={canEditStatus}
          />

          <section className="rounded-md border border-stripe-border bg-white p-5 shadow-stripe-card">
            <p className="text-xs font-medium uppercase tracking-wide text-stripe-body">
              Client
            </p>
            <div className="mt-4 flex gap-3">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-900"
                aria-hidden
              >
                {initialsFromName(order.customer_name)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-stripe-heading">
                  {order.customer_name}
                </p>
                <p className="text-sm text-stripe-body">
                  Commande invitée · sans compte
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-stripe-heading">
              <p className="flex gap-2">
                <Phone
                  className="mt-0.5 h-4 w-4 shrink-0 text-stripe-body"
                  aria-hidden
                />
                <span className="break-all">{order.customer_phone}</span>
              </p>
              <p className="flex gap-2">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-stripe-body"
                  aria-hidden
                />
                <span>
                  {order.customer_address}
                  {locationLine ? (
                    <>
                      <br />
                      <span className="text-stripe-body">{locationLine}</span>
                    </>
                  ) : null}
                </span>
              </p>
              {order.customer_notes ? (
                <p className="rounded-md border border-stripe-border bg-stripe-canvas/50 px-3 py-2 text-stripe-body">
                  <span className="font-medium text-stripe-heading">Note : </span>
                  {order.customer_notes}
                </p>
              ) : null}
            </div>
            {waDigits ? (
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stripe-success text-sm font-medium text-white transition-colors hover:bg-stripe-success-text"
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Contacter sur WhatsApp
              </a>
            ) : (
              <p className="mt-4 text-sm text-stripe-body">
                Numéro non reconnu pour ouvrir WhatsApp.
              </p>
            )}
          </section>

          <OrderLogisticsTimeline
            order={{
              status: orderStatus,
              created_at: order.created_at,
              confirmed_at: order.confirmed_at,
              shipped_at: order.shipped_at,
              delivered_at: order.delivered_at,
              returned_at: order.returned_at,
              cancelled_at: order.cancelled_at,
            }}
          />
        </div>
      </div>
    </div>
  )
}
