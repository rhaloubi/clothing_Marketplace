import {
  DashboardHeaderSkeleton,
  DashboardSpinnerRow,
  DashboardTableSkeleton,
} from "@/components/dashboard/dashboard-loaders"

export default function Loading() {
  return (
    <div className="space-y-6">
      <DashboardHeaderSkeleton />
      <div className="h-11 rounded-md bg-stripe-canvas" />
      <DashboardTableSkeleton rows={7} cols={5} titleWidth="w-44" />
      <DashboardSpinnerRow label="Chargement des produits…" />
    </div>
  )
}
