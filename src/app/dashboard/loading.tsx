import {
  DashboardHeaderSkeleton,
  DashboardKpiGridSkeleton,
  DashboardSpinnerRow,
  DashboardTableSkeleton,
} from "@/components/dashboard/dashboard-loaders"

export default function Loading() {
  return (
    <div className="space-y-6 pb-10 sm:space-y-8">
      <DashboardHeaderSkeleton />
      <DashboardKpiGridSkeleton />
      <DashboardTableSkeleton rows={4} cols={5} titleWidth="w-40" />
      <DashboardSpinnerRow label="Chargement des sections du tableau de bord…" />
    </div>
  )
}
