import type { ReactNode } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Eye,
  Package,
  Percent,
  Receipt,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"
import {
  DashboardTableCard,
  dashboardLinkPrimary,
  dashboardTableBodyRowClass,
  dashboardTableHeadClass,
  dashboardTableHeaderRowClass,
} from "@/components/dashboard/dashboard-page"
import { DashboardHomeRefreshButton } from "@/components/dashboard/home/dashboard-home-refresh-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DashboardTodaySnapshot } from "@/lib/server/dashboard-home"
import {
  cn,
  formatDateTime,
  formatPrice,
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/lib/utils"
import type { OrderStatus } from "@/types"

const PIPELINE: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "En attente" },
  { status: "confirmed", label: "Confirmée" },
  { status: "shipped", label: "Expédiée" },
  { status: "delivered", label: "Livrée" },
  { status: "returned", label: "Retournée" },
  { status: "cancelled", label: "Annulée" },
]

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClassName,
}: {
  label: string
  value: string
  sub?: ReactNode
  icon: React.ComponentType<{ className?: string }>
  iconClassName: string
}) {
  return (
    <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0">
      <CardContent className="relative p-4 sm:p-5">
        <div
          className={cn(
            "absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full",
            iconClassName
          )}
        >
          <Icon className="h-5 w-5 text-white" aria-hidden />
        </div>
        <p className="pe-14 text-xs font-medium uppercase tracking-wide text-stripe-label">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums-stripe tracking-tight text-stripe-heading">
          {value}
        </p>
        {sub ? <div className="mt-1.5 text-sm">{sub}</div> : null}
      </CardContent>
    </Card>
  )
}

export function DashboardHomeView({
  storeId,
  storeName,
  snapshot,
}: {
  storeId: string
  storeName: string
  snapshot: DashboardTodaySnapshot
}) {
  const { kpis, statusCountsToday, recentOrders, traffic, dateLabelFr, lowStockProductCount } =
    snapshot
  const activeToday = kpis.ordersCount

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-stripe-heading">
            Tableau de bord
          </h1>
          <p className="text-sm capitalize text-stripe-body">{dateLabelFr}</p>
          <p className="text-xs text-stripe-label">
            Fuseau : Casablanca · {storeName}
          </p>
        </div>
        <DashboardHomeRefreshButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Chiffre d'affaires (aujourd'hui)"
          value={formatPrice(kpis.revenueMad)}
          sub={
            kpis.vsYesterday.revenueDeltaPct !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  kpis.vsYesterday.revenueDeltaPct >= 0
                    ? "text-stripe-success-text"
                    : "text-red-600"
                )}
              >
                {kpis.vsYesterday.revenueDeltaPct >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
                )}
                {kpis.vsYesterday.revenueDeltaPct >= 0 ? "+" : ""}
                {kpis.vsYesterday.revenueDeltaPct}% vs hier
              </span>
            ) : (
              <span className="text-stripe-body">
                Comparaison CA indisponible (hier sans vente).
              </span>
            )
          }
          icon={TrendingUp}
          iconClassName="bg-emerald-500 shadow-sm"
        />
        <KpiCard
          label="Commandes"
          value={String(kpis.ordersCount)}
          sub={
            kpis.vsYesterday.ordersDelta !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  kpis.vsYesterday.ordersDelta >= 0
                    ? "text-stripe-success-text"
                    : "text-red-600"
                )}
              >
                {kpis.vsYesterday.ordersDelta >= 0 ? "+" : ""}
                {kpis.vsYesterday.ordersDelta} vs hier
              </span>
            ) : (
              <span className="text-stripe-body">Même volume qu&apos;hier.</span>
            )
          }
          icon={ShoppingCart}
          iconClassName="bg-stripe-purple shadow-sm"
        />
        <KpiCard
          label="Panier moyen"
          value={
            kpis.avgOrderMad > 0 ? formatPrice(kpis.avgOrderMad) : "—"
          }
          sub={
            <span className="text-stripe-body">
              Sur commandes prises en compte pour le CA
            </span>
          }
          icon={Receipt}
          iconClassName="bg-violet-400 shadow-sm"
        />
        <KpiCard
          label="Livraison réussie"
          value={`${kpis.deliveredRatePct}%`}
          sub={
            <span className="text-stripe-body">
              Part des commandes du jour déjà livrées
            </span>
          }
          icon={Percent}
          iconClassName="bg-teal-500 shadow-sm"
        />
        <KpiCard
          label="En attente (COD)"
          value={formatPrice(kpis.pendingMad)}
          sub={
            <span className="text-stripe-body">
              {kpis.pendingCount} commande{kpis.pendingCount > 1 ? "s" : ""} à traiter
            </span>
          }
          icon={AlertTriangle}
          iconClassName="bg-red-500 shadow-sm"
        />
        <KpiCard
          label="Annulées aujourd'hui"
          value={String(kpis.cancelledCount)}
          sub={
            <span className="text-stripe-body">
              Hors CA (annulations du jour)
            </span>
          }
          icon={Ban}
          iconClassName="bg-sky-500 shadow-sm"
        />
      </div>

      <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="relative flex h-2.5 w-2.5 shrink-0"
                aria-hidden
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <h2 className="text-base font-semibold text-stripe-heading">
                Activité du jour
              </h2>
            </div>
            <p className="text-sm font-medium tabular-nums-stripe text-stripe-body">
              {activeToday} commande{activeToday > 1 ? "s" : ""} · aujourd&apos;hui
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {PIPELINE.map(({ status, label }) => {
              const n = statusCountsToday[status] ?? 0
              return (
                <div
                  key={status}
                  className="rounded-md border border-stripe-border bg-stripe-canvas/60 px-3 py-3 text-center"
                >
                  <p className="text-2xl font-semibold tabular-nums-stripe text-stripe-heading">
                    {n}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stripe-label">
                    {label}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="min-w-0 rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0 lg:col-span-1">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-stripe-purple" aria-hidden />
              <h2 className="text-base font-semibold text-stripe-heading">
                Trafic boutique (aujourd&apos;hui)
              </h2>
            </div>
            <p className="text-xs text-stripe-body">
              Aperçu léger — les analyses détaillées sont dans Statistiques (formule Growth).
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-2 border-b border-stripe-border pb-2">
                <span className="text-stripe-body">Pages vues</span>
                <span className="font-semibold tabular-nums-stripe text-stripe-heading">
                  {traffic.page_views}
                </span>
              </li>
              <li className="flex justify-between gap-2 border-b border-stripe-border pb-2">
                <span className="text-stripe-body">Ajouts panier</span>
                <span className="font-semibold tabular-nums-stripe text-stripe-heading">
                  {traffic.cart_adds}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-stripe-body">Débuts checkout</span>
                <span className="font-semibold tabular-nums-stripe text-stripe-heading">
                  {traffic.checkout_starts}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4 lg:col-span-2">
          <DashboardTableCard className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stripe-border px-3 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-stripe-heading">
                Dernières commandes
              </h2>
              <Link
                href={`/dashboard/orders?store=${storeId}`}
                className="text-sm font-medium text-stripe-purple hover:underline"
              >
                Voir tout
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-stripe-body sm:px-5">
                Aucune commande pour le moment.
              </p>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[620px]">
                  <TableHeader>
                    <TableRow className={dashboardTableHeaderRowClass}>
                      <TableHead className={dashboardTableHeadClass}>Commande</TableHead>
                      <TableHead className={dashboardTableHeadClass}>Client</TableHead>
                      <TableHead className={dashboardTableHeadClass}>Total</TableHead>
                      <TableHead className={dashboardTableHeadClass}>Statut</TableHead>
                      <TableHead className={dashboardTableHeadClass}>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((o) => (
                      <TableRow key={o.id} className={dashboardTableBodyRowClass}>
                        <TableCell className="px-3 py-3">
                          <Link
                            href={`/dashboard/orders/${o.id}?store=${storeId}`}
                            className="font-semibold text-stripe-purple hover:underline"
                          >
                            {o.order_number}
                          </Link>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm text-stripe-heading">
                          {o.customer_name}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm font-medium tabular-nums-stripe text-stripe-heading">
                          {formatPrice(o.total_mad)}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              getOrderStatusColor(o.status)
                            )}
                          >
                            {getOrderStatusLabel(o.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm text-stripe-body">
                          {formatDateTime(o.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DashboardTableCard>

          <Card className="min-w-0 rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                  <Package className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-stripe-heading">
                    Stock bas
                  </h2>
                  <p className="text-sm text-stripe-body">
                    {lowStockProductCount > 0
                      ? `${lowStockProductCount} produit${lowStockProductCount > 1 ? "s" : ""} sous le seuil d’alerte.`
                      : "Aucun produit en alerte stock pour l’instant."}
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/products?store=${storeId}&stock=low`}
                className={cn(
                  dashboardLinkPrimary,
                  "w-full justify-center self-stretch sm:w-auto sm:shrink-0 sm:self-center"
                )}
              >
                Ouvrir l’inventaire
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
