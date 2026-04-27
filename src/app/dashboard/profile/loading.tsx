import {
  DashboardFormSectionSkeleton,
  DashboardHeaderSkeleton,
  DashboardTableSkeleton,
} from "@/components/dashboard/dashboard-loaders"

export default function Loading() {
  return (
    <div className="space-y-5 overflow-x-hidden pb-8 sm:space-y-8">
      <DashboardHeaderSkeleton />
      <div className="grid gap-4 sm:gap-6 lg:gap-8 xl:grid-cols-[1fr_minmax(280px,340px)] xl:items-start">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <DashboardFormSectionSkeleton fields={3} />
          <DashboardFormSectionSkeleton fields={2} />
          <DashboardTableSkeleton rows={7} cols={4} titleWidth="w-44" />
        </div>
        <div className="min-w-0">
          <DashboardFormSectionSkeleton fields={4} />
        </div>
      </div>
    </div>
  )
}
