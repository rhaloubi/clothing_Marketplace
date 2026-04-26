"use client"

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { AnalyticsRevenueCompareChartRow } from "@/types"

function formatMadCompact(n: number): string {
  return new Intl.NumberFormat("fr-MA", {
    maximumFractionDigits: 0,
  }).format(n)
}

export function AnalyticsRevenueCompareChart({
  rows,
}: {
  rows: AnalyticsRevenueCompareChartRow[]
}) {
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-stripe-body">
        Aucune donnée sur cette période.
      </p>
    )
  }

  return (
    <div className="h-[min(360px,50vh)] w-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#e5edf5" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="labelShort"
            tick={{ fontSize: 11, fill: "#6b7c93" }}
            tickLine={false}
            axisLine={{ stroke: "#e5edf5" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7c93" }}
            tickLine={false}
            axisLine={{ stroke: "#e5edf5" }}
            tickFormatter={(v) => formatMadCompact(Number(v))}
          />
          <Tooltip
            formatter={(value, name) => {
              const n =
                typeof value === "number"
                  ? value
                  : typeof value === "string"
                    ? Number(value)
                    : 0
              const label =
                name === "current_revenue"
                  ? "CA période actuelle"
                  : name === "previous_revenue"
                    ? "CA période précédente"
                    : String(name ?? "")
              return [`${formatMadCompact(Number.isFinite(n) ? n : 0)} MAD`, label]
            }}
            labelFormatter={(_, p) =>
              p?.length ? `Jour ${(p[0] as { payload?: { dayIndex?: number } }).payload?.dayIndex ?? ""}` : ""
            }
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5edf5",
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) =>
              value === "current_revenue"
                ? "CA actuel"
                : value === "previous_revenue"
                  ? "CA période précédente"
                  : String(value)
            }
          />
          <Line
            type="monotone"
            dataKey="previous_revenue"
            name="previous_revenue"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="current_revenue"
            name="current_revenue"
            stroke="#533afd"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
