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
import { AnalyticsModulesPanel } from "@/components/dashboard/analytics/analytics-modules-panel"
import { Card, CardContent } from "@/components/ui/card"
import type { AnalyticsRevenueCompareSnapshot } from "@/types"
import { cn, formatPrice } from "@/lib/utils"

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
  from,
  to,
}: {
  storeId: string
  snapshot: AnalyticsRevenueCompareSnapshot
  preset: "today" | "yesterday" | "7d" | "30d" | "custom"
  from?: string
  to?: string
}) {
  const { summary, chart_rows, current_range, previous_range } =
    snapshot
  const presetLink = (p: "today" | "yesterday" | "7d" | "30d") =>
    `/dashboard/analytics?store=${encodeURIComponent(storeId)}&preset=${p}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`

  return (
    <div className="space-y-8 pb-10">
      <DashboardPageHeader
        title="Statistiques"
        description="Comparez la période actuelle à la période précédente (fuseau Casablanca)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={presetLink("today")}
              className={cn(
                "inline-flex h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors",
                preset === "today"
                  ? "border-stripe-purple bg-stripe-purple-muted/30 text-stripe-purple"
                  : "border-stripe-border bg-white text-stripe-body hover:bg-stripe-canvas"
              )}
            >
              Aujourd&apos;hui
            </Link>
            <Link
              href={presetLink("yesterday")}
              className={cn(
                "inline-flex h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors",
                preset === "yesterday"
                  ? "border-stripe-purple bg-stripe-purple-muted/30 text-stripe-purple"
                  : "border-stripe-border bg-white text-stripe-body hover:bg-stripe-canvas"
              )}
            >
              Hier
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
            <form action="/dashboard/analytics" method="get" className="flex items-center gap-2">
              <input type="hidden" name="store" value={storeId} />
              <input type="hidden" name="preset" value="custom" />
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="h-11 rounded-md border border-stripe-border bg-white px-2 text-sm"
              />
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="h-11 rounded-md border border-stripe-border bg-white px-2 text-sm"
              />
              <button
                type="submit"
                className={cn(
                  "inline-flex h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors",
                  preset === "custom"
                    ? "border-stripe-purple bg-stripe-purple-muted/30 text-stripe-purple"
                    : "border-stripe-border bg-white text-stripe-body hover:bg-stripe-canvas"
                )}
              >
                Custom
              </button>
            </form>
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
      <AnalyticsModulesPanel storeId={storeId} preset={preset} from={from} to={to} />
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
