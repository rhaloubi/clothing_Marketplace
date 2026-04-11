import { redirect } from "next/navigation"
import { Suspense } from "react"
import { PlusCircle, ShoppingBag } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import {
  DashboardEmptyState,
  DashboardErrorCard,
  DashboardPageHeader,
  DashboardPaginationBar,
  DashboardPanelCard,
  DashboardTableCard,
  dashboardFilterInputClass,
  dashboardFilterSelectClass,
  dashboardLinkOutline,
} from "@/components/dashboard/dashboard-page"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { fetchOrdersList } from "@/lib/server/orders-list"
import { OrdersTable, type OrderTableRow } from "@/components/dashboard/orders/orders-table"
import { orderStatusSchema } from "@/lib/validations"

type SearchParams = Promise<{
  store?: string
  status?: string
  q?: string
  from?: string
  to?: string
  offset?: string
}>

const PAGE_SIZE = 20

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/

function parseOptionalDateParam(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  const v = value.trim()
  return DATE_PARAM.test(v) ? v : undefined
}

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
  const offsetRaw = Number.parseInt(params.offset ?? "0", 10)
  const offset = Number.isNaN(offsetRaw) ? 0 : Math.max(0, offsetRaw)

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Commandes"
        description="Suivez les commandes COD et mettez à jour leur statut."
      />

      <DashboardPanelCard
        title="Filtres"
        description="Recherchez par numéro, nom ou téléphone. Limitez par période."
      >
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_140px_140px_auto]">
          <input type="hidden" name="store" value={storeId} />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Rechercher une commande"
            className={cn(dashboardFilterInputClass, "sm:col-span-2 lg:col-span-1")}
          />
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className={dashboardFilterSelectClass}
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmée</option>
            <option value="shipped">Expédiée</option>
            <option value="delivered">Livrée</option>
            <option value="returned">Retournée</option>
            <option value="cancelled">Annulée</option>
          </select>
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
          <button type="submit" className={cn(dashboardLinkOutline, "sm:col-span-2 lg:col-span-1")}>
            Appliquer
          </button>
        </form>
      </DashboardPanelCard>

      <Suspense
        key={`${storeId}:${statusFilter ?? "all"}:${query}:${from ?? ""}:${to ?? ""}:${offset}`}
        fallback={<OrdersContentSkeleton />}
      >
        <OrdersContent
          supabaseStoreId={storeId}
          statusFilter={statusFilter}
          query={query}
          from={from}
          to={to}
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
  offset,
}: {
  supabaseStoreId: string
  statusFilter?: "pending" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled"
  query: string
  from?: string
  to?: string
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

  const prevOffset = Math.max(0, offset - PAGE_SIZE)
  const nextOffset = offset + PAGE_SIZE
  const hasPrev = offset > 0
  const hasNext = nextOffset < total

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
          label: "Ajouter un produit",
          icon: PlusCircle,
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

      <DashboardPaginationBar
        summary={`${offset + 1}-${Math.min(offset + rows.length, total)} sur ${total}`}
        prevHref={prevHref}
        nextHref={nextHref}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
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
