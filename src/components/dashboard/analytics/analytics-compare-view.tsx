import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
} from "lucide-react"
import {
  DashboardPanelCard,
  DashboardPageHeader,
  dashboardLinkPrimary,
} from "@/components/dashboard/dashboard-page"
import { AnalyticsRevenueCompareChart } from "@/components/dashboard/analytics/analytics-revenue-compare-chart"
import { Card, CardContent } from "@/components/ui/card"
import { ANALYTICS_COMPARE_EVENT_TYPES } from "@/lib/server/analytics-compare"
import type { AnalyticsEventsDailyRow, AnalyticsRevenueCompareSnapshot } from "@/types"
import { cn, formatPrice } from "@/lib/utils"
import type { AnalyticsEventType } from "@/types"

const EVENT_LABEL_FR: Record<AnalyticsEventType, string> = {
  page_view: "Pages vues",
  product_view: "Fiches produit",
  cart_add: "Ajouts panier",
  cart_remove: "Retraits panier",
  checkout_start: "Débuts checkout",
  checkout_abandon: "Abandons checkout",
  order_placed: "Commandes passées",
  order_delivered: "Livraisons enregistrées",
  order_returned: "Retours enregistrés",
}

function sumEventsByType(rows: AnalyticsEventsDailyRow[]): Record<AnalyticsEventType, number> {
  const out = {} as Record<AnalyticsEventType, number>
  for (const t of ANALYTICS_COMPARE_EVENT_TYPES) {
    out[t] = 0
  }
  for (const r of rows) {
    for (const t of ANALYTICS_COMPARE_EVENT_TYPES) {
      out[t] += r[t] ?? 0
    }
  }
  return out
}

function DeltaBadge({
  pct,
  label,
}: {
  pct: number | null
  label: string
}) {
  if (pct === null) {
    return (
      <span className="text-xs font-medium text-stripe-body">{label}</span>
    )
  }
  const up = pct >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        up ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
      )}
    >
      {up ? (
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      ) : (
        <ArrowDownRight className="h-3 w-3" aria-hidden />
      )}
      {up ? "+" : ""}
      {pct}% {label}
    </span>
  )
}

export function AnalyticsCompareView({
  storeId,
  snapshot,
  preset,
}: {
  storeId: string
  snapshot: AnalyticsRevenueCompareSnapshot
  preset: "7d" | "30d"
}) {
  const { summary, chart_rows, current_range, previous_range, events_daily_current, events_daily_previous } =
    snapshot
  const curEv = sumEventsByType(events_daily_current)
  const prevEv = sumEventsByType(events_daily_previous)

  const presetLink = (p: "7d" | "30d") =>
    `/dashboard/analytics?store=${encodeURIComponent(storeId)}&preset=${p}`

  return (
    <div className="space-y-8 pb-10">
      <DashboardPageHeader
        title="Statistiques"
        description="Comparez la période actuelle à la période précédente (fuseau Casablanca)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={presetLink("30d")}
              className={cn(
                "inline-flex h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors",
                preset === "30d"
                  ? "border-stripe-purple bg-stripe-purple-muted/30 text-stripe-purple"
                  : "border-stripe-border bg-white text-stripe-body hover:bg-stripe-canvas"
              )}
            >
              30 jours
            </Link>
            <Link
              href={presetLink("7d")}
              className={cn(
                "inline-flex h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors",
                preset === "7d"
                  ? "border-stripe-purple bg-stripe-purple-muted/30 text-stripe-purple"
                  : "border-stripe-border bg-white text-stripe-body hover:bg-stripe-canvas"
              )}
            >
              7 jours
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card">
          <CardContent className="space-y-2 p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-stripe-label">
              CA ({preset === "30d" ? "30 j." : "7 j."})
            </p>
            <p className="text-2xl font-semibold tabular-nums-stripe text-stripe-heading">
              {formatPrice(summary.current.revenue_mad)}
            </p>
            <DeltaBadge pct={summary.delta_revenue_pct} label="vs période préc." />
          </CardContent>
        </Card>
        <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card">
          <CardContent className="space-y-2 p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-stripe-label">
              Commandes
            </p>
            <p className="text-2xl font-semibold tabular-nums-stripe text-stripe-heading">
              {summary.current.orders}
            </p>
            <DeltaBadge pct={summary.delta_orders_pct} label="vs période préc." />
          </CardContent>
        </Card>
        <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card">
          <CardContent className="space-y-2 p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-stripe-label">
              Panier moyen
            </p>
            <p className="text-2xl font-semibold tabular-nums-stripe text-stripe-heading">
              {formatPrice(summary.current.avg_order_mad)}
            </p>
            <DeltaBadge pct={summary.delta_avg_order_pct} label="vs période préc." />
          </CardContent>
        </Card>
        <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card">
          <CardContent className="space-y-2 p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-stripe-label">
              Période précédente
            </p>
            <p className="text-sm font-medium text-stripe-heading">
              {previous_range.label_fr}
            </p>
            <p className="text-xs text-stripe-body">
              Actuelle : {current_range.label_fr}
            </p>
          </CardContent>
        </Card>
      </div>

      <DashboardPanelCard
        title="Chiffre d'affaires — comparaison"
        description="Courbe actuelle (violet) vs période précédente (pointillés), même longueur, alignée jour par jour."
      >
        <AnalyticsRevenueCompareChart rows={chart_rows} />
      </DashboardPanelCard>

      <DashboardPanelCard
        title="Événements boutique (agrégés serveur)"
        description="Totaux sur la période actuelle vs période précédente — pas d’agrégation côté navigateur."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-stripe-border text-left text-xs font-semibold uppercase tracking-wide text-stripe-label">
                <th className="py-2 pe-4">Événement</th>
                <th className="py-2 pe-4 text-end tabular-nums-stripe">Actuel</th>
                <th className="py-2 text-end tabular-nums-stripe">Précédent</th>
              </tr>
            </thead>
            <tbody>
              {ANALYTICS_COMPARE_EVENT_TYPES.map((t) => (
                <tr key={t} className="border-b border-stripe-border/80 last:border-0">
                  <td className="py-2.5 pe-4 font-medium text-stripe-heading">
                    {EVENT_LABEL_FR[t]}
                  </td>
                  <td className="py-2.5 pe-4 text-end tabular-nums-stripe text-stripe-heading">
                    {curEv[t]}
                  </td>
                  <td className="py-2.5 text-end tabular-nums-stripe text-stripe-body">
                    {prevEv[t]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardPanelCard>
    </div>
  )
}

export function AnalyticsUpgradeRequired({ storeId }: { storeId: string | null }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-md border border-stripe-border bg-white p-6 text-center shadow-stripe-card">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stripe-purple-muted/40 text-stripe-purple">
        <BarChart2 className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-stripe-heading">Statistiques avancées</h1>
      <p className="text-sm text-stripe-body">
        Les comparaisons de CA et les rapports détaillés sont disponibles à partir de la
        formule <span className="font-medium text-stripe-heading">Growth</span>.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard/profile"
          className={cn(dashboardLinkPrimary, "justify-center")}
        >
          Voir les formules
        </Link>
        {storeId ? (
          <Link
            href={`/dashboard?store=${storeId}`}
            className="inline-flex h-11 items-center justify-center rounded-md border border-stripe-border px-4 text-sm font-medium text-stripe-heading hover:bg-stripe-canvas"
          >
            Retour au tableau de bord
          </Link>
        ) : null}
      </div>
    </div>
  )
}
