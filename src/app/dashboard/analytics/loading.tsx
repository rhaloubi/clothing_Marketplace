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
      <DashboardKpiGridSkeleton count={4} />
      <DashboardTableSkeleton rows={6} cols={4} titleWidth="w-56" />
      <DashboardSpinnerRow label="Chargement des modules analytiques…" />
    </div>
  )
}
