"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import type {
  AnalyticsBreakdownSnapshot,
  AnalyticsCancellationSnapshot,
  AnalyticsComparePreset,
  AnalyticsFulfillmentSnapshot,
  AnalyticsOverviewSnapshot,
  AnalyticsPeakHoursSnapshot,
} from "@/types"
import { cn, formatPrice } from "@/lib/utils"

type TabId = "overview" | "breakdown" | "fulfillment" | "cancellations" | "peak-hours"

function buildAnalyticsPath(
  base: string,
  storeId: string,
  preset: AnalyticsComparePreset,
  from?: string,
  to?: string
): string {
  const qs = new URLSearchParams({ store_id: storeId, preset })
  if (from) qs.set("from", from)
  if (to) qs.set("to", to)
  return `${base}?${qs.toString()}`
}

export function AnalyticsModulesPanel({
  storeId,
  preset,
  from,
  to,
}: {
  storeId: string
  preset: AnalyticsComparePreset
  from?: string
  to?: string
}) {
  const [tab, setTab] = useState<TabId>("overview")
  const params = useMemo(() => ({ storeId, preset, from, to }), [storeId, preset, from, to])

  const overview = useQuery({
    queryKey: ["analytics", "overview", params],
    queryFn: () =>
      apiFetch<AnalyticsOverviewSnapshot>(
        buildAnalyticsPath("/api/analytics/overview", storeId, preset, from, to)
      ),
    enabled: tab === "overview",
  })
  const breakdown = useQuery({
    queryKey: ["analytics", "breakdown", params],
    queryFn: () =>
      apiFetch<AnalyticsBreakdownSnapshot>(
        buildAnalyticsPath("/api/analytics/breakdown", storeId, preset, from, to)
      ),
    enabled: tab === "breakdown",
  })
  const fulfillment = useQuery({
    queryKey: ["analytics", "fulfillment", params],
    queryFn: () =>
      apiFetch<AnalyticsFulfillmentSnapshot>(
        buildAnalyticsPath("/api/analytics/fulfillment", storeId, preset, from, to)
      ),
    enabled: tab === "fulfillment",
  })
  const cancellations = useQuery({
    queryKey: ["analytics", "cancellations", params],
    queryFn: () =>
      apiFetch<AnalyticsCancellationSnapshot>(
        buildAnalyticsPath("/api/analytics/cancellations", storeId, preset, from, to)
      ),
    enabled: tab === "cancellations",
  })
  const peakHours = useQuery({
    queryKey: ["analytics", "peak-hours", params],
    queryFn: () =>
      apiFetch<AnalyticsPeakHoursSnapshot>(
        buildAnalyticsPath("/api/analytics/peak-hours", storeId, preset, from, to)
      ),
    enabled: tab === "peak-hours",
  })

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "breakdown", label: "Répartition" },
    { id: "fulfillment", label: "Exécution" },
    { id: "cancellations", label: "Annulations" },
    { id: "peak-hours", label: "Heures de pointe" },
  ]

  return (
    <section className="space-y-4 rounded-md border border-stripe-border bg-white p-4 shadow-stripe-card">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex h-10 items-center rounded-md border px-3 text-sm font-medium",
              tab === t.id
                ? "border-stripe-purple bg-stripe-purple-muted/30 text-stripe-purple"
                : "border-stripe-border text-stripe-body hover:bg-stripe-canvas"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Commandes" value={overview.data?.summary.totalOrders ?? 0} loading={overview.isLoading} />
          <Metric label="Terminées" value={overview.data?.summary.completedOrders ?? 0} loading={overview.isLoading} />
          <Metric label="Annulées" value={overview.data?.summary.cancelledOrders ?? 0} loading={overview.isLoading} />
          <Metric
            label="Taux d'annulation"
            value={`${overview.data?.summary.cancellationRate ?? 0}%`}
            loading={overview.isLoading}
          />
        </div>
      ) : null}

      {tab === "breakdown" ? (
        <div className="space-y-2 text-sm">
          {breakdown.data?.byChannel.map((row) => (
            <div key={row.key} className="flex items-center justify-between rounded-md border border-stripe-border px-3 py-2">
              <span>{row.key}</span>
              <span className="font-medium">{formatPrice(row.revenue)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "fulfillment" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Préparation moyenne" value={fulfillment.data?.averagePreparationTime ?? "00:00:00"} loading={fulfillment.isLoading} />
          <Metric label="Livraison moyenne" value={fulfillment.data?.averageDeliveryTime ?? "00:00:00"} loading={fulfillment.isLoading} />
          <Metric label="Retards" value={fulfillment.data?.lateOrders ?? 0} loading={fulfillment.isLoading} />
        </div>
      ) : null}

      {tab === "cancellations" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Total annulations" value={cancellations.data?.totalCancellations ?? 0} loading={cancellations.isLoading} />
          <Metric label="Taux" value={`${cancellations.data?.cancellationRate ?? 0}%`} loading={cancellations.isLoading} />
          <Metric label="Revenu perdu" value={formatPrice(cancellations.data?.estimatedRevenueLost ?? 0)} loading={cancellations.isLoading} />
        </div>
      ) : null}

      {tab === "peak-hours" ? (
        <div className="space-y-2 text-sm">
          {(peakHours.data?.peakHours ?? []).map((row) => (
            <div key={row.hour} className="flex items-center justify-between rounded-md border border-stripe-border px-3 py-2">
              <span>{String(row.hour).padStart(2, "0")}:00</span>
              <span className="font-medium">{row.orders} commandes</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function Metric({
  label,
  value,
  loading,
}: {
  label: string
  value: string | number
  loading: boolean
}) {
  return (
    <div className="rounded-md border border-stripe-border px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-stripe-label">{label}</p>
      <p className="text-lg font-semibold text-stripe-heading">{loading ? "..." : value}</p>
    </div>
  )
}
