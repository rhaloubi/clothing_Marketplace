import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function DashboardHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-52 sm:h-8 sm:w-64" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  )
}

export function DashboardKpiGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-stripe-border bg-white p-4 shadow-stripe-card">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-3 h-4 w-44" />
        </div>
      ))}
    </div>
  )
}

export function DashboardTableSkeleton({
  rows = 5,
  cols = 5,
  titleWidth = "w-44",
}: {
  rows?: number
  cols?: number
  titleWidth?: string
}) {
  return (
    <div className="overflow-hidden rounded-md border border-stripe-border bg-white shadow-stripe-card">
      <div className="flex items-center justify-between gap-2 border-b border-stripe-border px-4 py-3 sm:px-5">
        <Skeleton className={cn("h-5", titleWidth)} />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-2 px-4 py-3 sm:px-5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid grid-cols-5 gap-3">
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardFormSectionSkeleton({
  fields = 4,
}: {
  fields?: number
}) {
  return (
    <div className="rounded-md border border-stripe-border bg-white p-4 shadow-stripe-card sm:p-5">
      <Skeleton className="h-5 w-40" />
      <div className="mt-5 space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardSpinnerRow({
  label = "Chargement…",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-stripe-body", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
