import { redirect } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { Download, Funnel, ShoppingBag } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import {
  DashboardEmptyState,
  DashboardErrorCard,
  DashboardTableCard,
  dashboardFilterInputClass,
  dashboardLinkOutline,
} from "@/components/dashboard/dashboard-page"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { fetchOrdersList } from "@/lib/server/orders-list"
import { OrdersTable, type OrderTableRow } from "@/components/dashboard/orders/orders-table"
import { DashboardHomeRefreshButton } from "@/components/dashboard/home/dashboard-home-refresh-button"
import { orderStatusSchema } from "@/lib/validations"

type SearchParams = Promise<{
  store?: string
  status?: string
  q?: string
  from?: string
  to?: string
  filters?: string
  offset?: string
}>

const PAGE_SIZE = 20

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/

function parseOptionalDateParam(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  const v = value.trim()
  return DATE_PARAM.test(v) ? v : undefined
}

const STATUS_TABS = [
  { value: "", label: "Toutes" },
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmée" },
  { value: "shipped", label: "Expédiée" },
  { value: "delivered", label: "Livrée" },
  { value: "returned", label: "Retournée" },
  { value: "cancelled", label: "Annulée" },
] as const

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const storeId = parseStoreId(params.store)
  if (!storeId) redirect("/dashboard")

  const statusParsed = orderStatusSchema.safeParse(params.status)
  const statusFilter = statusParsed.success ? statusParsed.data : undefined
  const query = (params.q ?? "").trim()
  let from = parseOptionalDateParam(params.from)
  let to = parseOptionalDateParam(params.to)
  if (from && to && from > to) {
    const t = from
    from = to
    to = t
  }
  const showFilters = params.filters === "1"
  const offsetRaw = Number.parseInt(params.offset ?? "0", 10)
  const offset = Number.isNaN(offsetRaw) ? 0 : Math.max(0, offsetRaw)
  const baseParams = new URLSearchParams({ store: storeId })
  if (query) baseParams.set("q", query)
  if (from) baseParams.set("from", from)
  if (to) baseParams.set("to", to)
  if (showFilters) baseParams.set("filters", "1")

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-stripe-heading">
            Commandes
          </h1>
          <p className="text-sm text-stripe-body">
            Suivez les transactions marchandes et l&apos;état de vos commandes.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => {
              const p = new URLSearchParams(baseParams)
              if (tab.value) p.set("status", tab.value)
              else p.delete("status")
              p.delete("offset")
              const href = `/dashboard/orders?${p.toString()}`
              const active = (statusFilter ?? "") === tab.value
              return (
                <Link
                  key={tab.value || "all"}
                  href={href}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-colors",
                    active
                      ? "bg-stripe-purple text-white shadow-sm"
                      : "bg-white text-stripe-body ring-1 ring-stripe-border hover:bg-stripe-canvas"
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardHomeRefreshButton className="h-10 min-h-10" />
            <Link
              href={`/dashboard/orders?${(() => {
                const p = new URLSearchParams(baseParams)
                p.set("filters", showFilters ? "0" : "1")
                p.delete("offset")
                if (statusFilter) p.set("status", statusFilter)
                return p.toString()
              })()}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stripe-border bg-white text-stripe-label transition-colors hover:bg-stripe-canvas hover:text-stripe-heading"
              aria-label="Afficher les filtres"
            >
              <Funnel className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stripe-border bg-white text-stripe-label transition-colors hover:bg-stripe-canvas hover:text-stripe-heading"
              aria-label="Exporter"
            >
              <Download className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        {showFilters ? (
          <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0">
            <CardContent className="pt-4">
              <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_140px_140px_auto]">
                <input type="hidden" name="store" value={storeId} />
                {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
                <input type="hidden" name="filters" value="1" />
                <Input
                  name="q"
                  defaultValue={query}
                  placeholder="Rechercher une commande"
                  className={cn(dashboardFilterInputClass, "sm:col-span-2 lg:col-span-1")}
                />
                <Input
                  type="date"
                  name="from"
                  defaultValue={from ?? ""}
                  className={cn(dashboardFilterInputClass, "text-zinc-800")}
                  aria-label="Du"
                />
                <Input
                  type="date"
                  name="to"
                  defaultValue={to ?? ""}
                  className={cn(dashboardFilterInputClass, "text-zinc-800")}
                  aria-label="Au"
                />
                <button type="submit" className={dashboardLinkOutline}>
                  Appliquer
                </button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <Suspense
        key={`${storeId}:${statusFilter ?? "all"}:${query}:${from ?? ""}:${to ?? ""}:${offset}:${showFilters ? 1 : 0}`}
        fallback={<OrdersContentSkeleton />}
      >
        <OrdersContent
          supabaseStoreId={storeId}
          statusFilter={statusFilter}
          query={query}
          from={from}
          to={to}
          showFilters={showFilters}
          offset={offset}
        />
      </Suspense>
    </div>
  )
}

async function OrdersContent({
  supabaseStoreId,
  statusFilter,
  query,
  from,
  to,
  showFilters,
  offset,
}: {
  supabaseStoreId: string
  statusFilter?: "pending" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled"
  query: string
  from?: string
  to?: string
  showFilters: boolean
  offset: number
}) {
  const supabase = await createClient()

  const { orders, total, error } = await fetchOrdersList(supabase, {
    storeId: supabaseStoreId,
    status: statusFilter,
    searchText: query,
    from,
    to,
    offset,
    limit: PAGE_SIZE,
  })

  const rows: OrderTableRow[] = orders

  const baseParams = new URLSearchParams({ store: supabaseStoreId })
  if (statusFilter) baseParams.set("status", statusFilter)
  if (query) baseParams.set("q", query)
  if (from) baseParams.set("from", from)
  if (to) baseParams.set("to", to)
  if (showFilters) baseParams.set("filters", "1")

  const prevOffset = Math.max(0, offset - PAGE_SIZE)
  const nextOffset = offset + PAGE_SIZE
  const hasPrev = offset > 0
  const hasNext = nextOffset < total
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  const prevHref = (() => {
    const p = new URLSearchParams(baseParams)
    p.set("offset", String(prevOffset))
    return `/dashboard/orders?${p.toString()}`
  })()
  const nextHref = (() => {
    const p = new URLSearchParams(baseParams)
    p.set("offset", String(nextOffset))
    return `/dashboard/orders?${p.toString()}`
  })()

  if (error) {
    return (
      <DashboardErrorCard
        message="Impossible de charger les commandes."
        hint="Actualisez la page ou réessayez dans quelques instants."
      />
    )
  }

  if (rows.length === 0) {
    return (
      <DashboardEmptyState
        icon={ShoppingBag}
        title="Aucune commande pour le moment"
        description="Les commandes apparaissent quand un client valide son panier."
        action={{
          href: `/dashboard/products?store=${supabaseStoreId}`,
          label: "Voir les produits",
        }}
      />
    )
  }

  return (
    <>
      <DashboardTableCard>
        <div className="overflow-x-auto">
          <OrdersTable orders={rows} storeId={supabaseStoreId} />
        </div>
      </DashboardTableCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stripe-body tabular-nums-stripe">
          Affichage {offset + 1}-{Math.min(offset + rows.length, total)} sur {total}
        </p>
        <div className="flex items-center gap-1">
          <Link
            href={prevHref}
            aria-disabled={!hasPrev}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-stripe-border bg-white px-2 text-sm text-stripe-body transition-colors hover:bg-stripe-canvas",
              !hasPrev && "pointer-events-none opacity-40"
            )}
          >
            ‹
          </Link>
          {Array.from({ length: Math.min(3, pageCount) }, (_, i) => {
            const pageNumber = i + Math.max(1, Math.min(currentPage - 1, pageCount - 2))
            const pageOffset = (pageNumber - 1) * PAGE_SIZE
            const p = new URLSearchParams(baseParams)
            p.set("offset", String(pageOffset))
            const href = `/dashboard/orders?${p.toString()}`
            const active = pageNumber === currentPage
            return (
              <Link
                key={pageNumber}
                href={href}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-medium tabular-nums-stripe transition-colors",
                  active
                    ? "bg-stripe-purple text-white shadow-sm"
                    : "border border-stripe-border bg-white text-stripe-body hover:bg-stripe-canvas"
                )}
              >
                {pageNumber}
              </Link>
            )
          })}
          <Link
            href={nextHref}
            aria-disabled={!hasNext}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-stripe-border bg-white px-2 text-sm text-stripe-body transition-colors hover:bg-stripe-canvas",
              !hasNext && "pointer-events-none opacity-40"
            )}
          >
            ›
          </Link>
        </div>
      </div>
    </>
  )
}

function OrdersContentSkeleton() {
  return (
    <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0">
      <CardContent className="space-y-3 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}
