import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Page title + subtitle (Stripe-style zinc typography). */
export function DashboardPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

/** Filter / settings panel — white card, zinc border, light shadow. */
export function DashboardPanelCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn(
        "border border-zinc-200 bg-white shadow-sm ring-0",
        className
      )}
    >
      <CardHeader className="border-b border-zinc-100 pb-4">
        <CardTitle className="text-base font-semibold text-zinc-900">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-zinc-500">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

/** Table + list body card (no duplicate header inside). */
export function DashboardTableCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn(
        "border border-zinc-200 bg-white shadow-sm ring-0",
        className
      )}
    >
      <CardContent className="p-0 sm:p-0">{children}</CardContent>
    </Card>
  )
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action: { href: string; label: string; icon?: LucideIcon }
}) {
  const ActionIcon = action.icon
  return (
    <Card className="border border-zinc-200 bg-white shadow-sm ring-0">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
          <Icon className="h-5 w-5 text-violet-600" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-zinc-900">{title}</p>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
        <Link href={action.href} className={dashboardLinkPrimary}>
          {ActionIcon ? <ActionIcon className="h-4 w-4" aria-hidden /> : null}
          {action.label}
        </Link>
      </CardContent>
    </Card>
  )
}

export function DashboardErrorCard({ message, hint }: { message: string; hint: string }) {
  return (
    <Card className="border border-zinc-200 bg-white shadow-sm ring-0">
      <CardContent className="py-8 text-center">
        <p className="text-sm font-medium text-zinc-900">{message}</p>
        <p className="mt-1 text-sm text-zinc-500">{hint}</p>
      </CardContent>
    </Card>
  )
}

export function DashboardPaginationBar({
  summary,
  prevHref,
  nextHref,
  hasPrev,
  hasNext,
}: {
  summary: string
  prevHref: string
  nextHref: string
  hasPrev: boolean
  hasNext: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-zinc-500">{summary}</p>
      <div className="flex items-center gap-2">
        <Link
          href={prevHref}
          aria-disabled={!hasPrev}
          className={cn(
            dashboardLinkOutline,
            "h-8 min-h-10 px-3 text-sm",
            !hasPrev && "pointer-events-none opacity-50"
          )}
        >
          Précédent
        </Link>
        <Link
          href={nextHref}
          aria-disabled={!hasNext}
          className={cn(
            dashboardLinkOutline,
            "h-8 min-h-10 px-3 text-sm",
            !hasNext && "pointer-events-none opacity-50"
          )}
        >
          Suivant
        </Link>
      </div>
    </div>
  )
}

/** Outline control (filters, secondary actions). */
export const dashboardLinkOutline = cn(
  "inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25"
)

/** Compact outline (table row actions, icon buttons). */
export const dashboardLinkOutlineSm = cn(
  "inline-flex h-8 min-h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25"
)

/** Primary CTA (violet, matches dashboard nav accent). */
export const dashboardLinkPrimary = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
)

/** Table header cell (Stripe-style dense label row). */
export const dashboardTableHeadClass = cn(
  "h-11 px-3 text-xs font-medium uppercase tracking-wide text-zinc-500"
)

export const dashboardTableHeaderRowClass = cn(
  "border-zinc-200 bg-zinc-50 hover:bg-zinc-50"
)

export const dashboardTableBodyRowClass = cn(
  "border-zinc-100 hover:bg-zinc-50/80"
)

/** Native select in filter forms. */
export const dashboardFilterSelectClass = cn(
  "h-9 min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 sm:w-auto"
)

/** Text input in filter forms. */
export const dashboardFilterInputClass = cn(
  "h-11 min-h-11 rounded-md border-zinc-200 bg-white shadow-sm focus-visible:border-violet-300 focus-visible:ring-2 focus-visible:ring-violet-500/25"
)
