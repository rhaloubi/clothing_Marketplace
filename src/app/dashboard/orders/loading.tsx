import {
  DashboardHeaderSkeleton,
  DashboardSpinnerRow,
  DashboardTableSkeleton,
} from "@/components/dashboard/dashboard-loaders"

export default function Loading() {
  return (
    <div className="space-y-5">
      <DashboardHeaderSkeleton />
      <div className="flex flex-wrap gap-2">
        <div className="h-10 w-24 rounded-full bg-stripe-canvas" />
        <div className="h-10 w-28 rounded-full bg-stripe-canvas" />
        <div className="h-10 w-24 rounded-full bg-stripe-canvas" />
      </div>
      <DashboardTableSkeleton rows={8} cols={5} titleWidth="w-40" />
      <DashboardSpinnerRow label="Chargement des commandes…" />
    </div>
  )
}
