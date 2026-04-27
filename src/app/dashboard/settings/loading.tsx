import {
  DashboardFormSectionSkeleton,
  DashboardHeaderSkeleton,
  DashboardSpinnerRow,
  DashboardTableSkeleton,
} from "@/components/dashboard/dashboard-loaders"

export default function Loading() {
  return (
    <div className="space-y-8 pb-20 sm:space-y-10">
      <DashboardHeaderSkeleton />
      <DashboardFormSectionSkeleton fields={5} />
      <DashboardFormSectionSkeleton fields={3} />
      <DashboardTableSkeleton rows={6} cols={4} titleWidth="w-44" />
      <DashboardSpinnerRow label="Chargement des paramètres…" />
    </div>
  )
}
