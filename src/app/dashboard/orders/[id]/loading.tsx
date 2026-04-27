import {
  DashboardHeaderSkeleton,
  DashboardFormSectionSkeleton,
  DashboardSpinnerRow,
} from "@/components/dashboard/dashboard-loaders"

export default function Loading() {
  return (
    <div className="space-y-5">
      <DashboardHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <DashboardFormSectionSkeleton fields={4} />
          <DashboardFormSectionSkeleton fields={4} />
        </div>
        <DashboardFormSectionSkeleton fields={3} />
      </div>
      <DashboardSpinnerRow label="Chargement de la commande…" />
    </div>
  )
}
