import { DashboardFormSectionSkeleton, DashboardHeaderSkeleton } from "@/components/dashboard/dashboard-loaders"

export default function Loading() {
  return (
    <div className="space-y-6">
      <DashboardHeaderSkeleton />
      <DashboardFormSectionSkeleton fields={6} />
    </div>
  )
}
