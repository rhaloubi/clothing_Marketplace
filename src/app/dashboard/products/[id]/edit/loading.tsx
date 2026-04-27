import { DashboardFormSectionSkeleton, DashboardHeaderSkeleton } from "@/components/dashboard/dashboard-loaders"

export default function Loading() {
  return (
    <div className="space-y-6">
      <DashboardHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-[1fr_min(100%,300px)]">
        <div className="space-y-6">
          <DashboardFormSectionSkeleton fields={5} />
          <DashboardFormSectionSkeleton fields={4} />
        </div>
        <div className="space-y-4">
          <DashboardFormSectionSkeleton fields={3} />
          <DashboardFormSectionSkeleton fields={3} />
        </div>
      </div>
    </div>
  )
}
