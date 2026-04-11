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

/** Page title + subtitle — Stripe deep navy + slate body (docs/stripe/DESIGN.md). */
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
        <h1 className="text-2xl font-medium tracking-tight text-stripe-heading">
          {title}
        </h1>
        <p className="text-sm text-stripe-body">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

const dashboardCardShell = cn(
  "rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0 transition-shadow duration-200 hover:shadow-stripe-card-hover"
)

/** Filter / settings panel — white card, Stripe border + shadow. */
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
    <Card className={cn(dashboardCardShell, className)}>
      <CardHeader className="border-b border-stripe-border pb-4">
        <CardTitle className="text-base font-medium text-stripe-heading">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-stripe-body">
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
    <Card className={cn(dashboardCardShell, className)}>
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
    <Card className={cn(dashboardCardShell, "hover:shadow-stripe-card")}>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-stripe-purple-muted/40">
          <Icon className="h-5 w-5 text-stripe-purple" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-stripe-heading">{title}</p>
          <p className="text-sm text-stripe-body">{description}</p>
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
    <Card className={cn(dashboardCardShell, "hover:shadow-stripe-card")}>
      <CardContent className="py-8 text-center">
        <p className="text-sm font-medium text-stripe-heading">{message}</p>
        <p className="mt-1 text-sm text-stripe-body">{hint}</p>
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
      <p className="text-sm text-stripe-body tabular-nums-stripe">{summary}</p>
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

/** Ghost / outlined — Stripe purple border + text, hover wash. */
export const dashboardLinkOutline = cn(
  "inline-flex min-h-11 items-center justify-center rounded-[4px] border border-stripe-purple-soft bg-white px-4 text-sm font-medium text-stripe-purple shadow-sm transition-colors hover:bg-[rgba(83,58,253,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/30"
)

/** Compact outline (table row actions). */
export const dashboardLinkOutlineSm = cn(
  "inline-flex h-8 min-h-10 items-center justify-center rounded-[4px] border border-stripe-border bg-white px-3 text-sm font-medium text-stripe-label shadow-sm transition-colors hover:border-stripe-purple-soft hover:bg-[rgba(83,58,253,0.04)] hover:text-stripe-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
)

/** Primary CTA — Stripe purple (#533afd). */
export const dashboardLinkPrimary = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] bg-stripe-purple px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-stripe-purple-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/40"
)

/** Table header cell — label color, dense caps. */
export const dashboardTableHeadClass = cn(
  "h-11 px-3 text-xs font-medium uppercase tracking-wide text-stripe-label"
)

export const dashboardTableHeaderRowClass = cn(
  "border-stripe-border bg-stripe-canvas hover:bg-stripe-canvas"
)

export const dashboardTableBodyRowClass = cn(
  "border-stripe-border/80 hover:bg-stripe-canvas/70"
)

export const dashboardFilterSelectClass = cn(
  "h-9 min-h-11 w-full rounded-[4px] border border-stripe-border bg-white px-3 text-sm text-stripe-heading shadow-sm focus-visible:outline-none focus-visible:border-stripe-purple focus-visible:ring-2 focus-visible:ring-stripe-purple/25 sm:w-auto"
)

export const dashboardFilterInputClass = cn(
  "h-11 min-h-11 rounded-[4px] border-stripe-border bg-white text-stripe-heading shadow-sm placeholder:text-stripe-body focus-visible:border-stripe-purple focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
)
