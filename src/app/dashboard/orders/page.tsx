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
import { OrdersTable, type OrderTableRow } from "@/components/dashboard/orders/orders-table"
import { orderStatusSchema } from "@/lib/validations"

type SearchParams = Promise<{
  store?: string
  status?: string
  q?: string
  offset?: string
}>

const PAGE_SIZE = 20

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
        description="Recherchez par numéro ou nom client."
      >
        <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input type="hidden" name="store" value={storeId} />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Rechercher une commande"
            className={cn(dashboardFilterInputClass)}
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
          <button type="submit" className={dashboardLinkOutline}>
            Appliquer
          </button>
        </form>
      </DashboardPanelCard>

      <Suspense
        key={`${storeId}:${statusFilter ?? "all"}:${query}:${offset}`}
        fallback={<OrdersContentSkeleton />}
      >
        <OrdersContent
          supabaseStoreId={storeId}
          statusFilter={statusFilter}
          query={query}
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
  offset,
}: {
  supabaseStoreId: string
  statusFilter?: "pending" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled"
  query: string
  offset: number
}) {
  const supabase = await createClient()

  let ordersQuery = supabase
    .from("orders")
    .select(
      "id, store_id, order_number, status, customer_name, total_mad, created_at",
      { count: "exact" }
    )
    .eq("store_id", supabaseStoreId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (statusFilter) {
    ordersQuery = ordersQuery.eq("status", statusFilter)
  }

  if (query.length > 0) {
    const escaped = query.replaceAll(",", "\\,")
    ordersQuery = ordersQuery.or(
      `order_number.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%`
    )
  }

  const { data, error, count } = await ordersQuery
  const orders = (data ?? []) as OrderTableRow[]
  const total = count ?? 0

  const baseParams = new URLSearchParams({ store: supabaseStoreId })
  if (statusFilter) baseParams.set("status", statusFilter)
  if (query) baseParams.set("q", query)

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

  if (orders.length === 0) {
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
          <OrdersTable orders={orders} storeId={supabaseStoreId} />
        </div>
      </DashboardTableCard>

      <DashboardPaginationBar
        summary={`${offset + 1}-${Math.min(offset + orders.length, total)} sur ${total}`}
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
    <Card className="border border-zinc-200 bg-white shadow-sm ring-0">
      <CardContent className="space-y-3 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}
