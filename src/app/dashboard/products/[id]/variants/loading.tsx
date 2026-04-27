import {
  DashboardFormSectionSkeleton,
  DashboardHeaderSkeleton,
  DashboardTableSkeleton,
} from "@/components/dashboard/dashboard-loaders"

export default function Loading() {
  return (
    <div className="space-y-8">
      <DashboardHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8">
          <DashboardFormSectionSkeleton fields={5} />
        </div>
        <div className="lg:col-span-4">
          <DashboardFormSectionSkeleton fields={3} />
        </div>
      </div>
      <DashboardTableSkeleton rows={6} cols={5} titleWidth="w-52" />
    </div>
  )
}
