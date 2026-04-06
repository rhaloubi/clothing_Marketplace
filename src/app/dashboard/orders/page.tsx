import Link from "next/link"
import { redirect } from "next/navigation"
import { PlusCircle, ShoppingBag } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

  const supabase = await createClient()

  let ordersQuery = supabase
    .from("orders")
    .select(
      "id, store_id, order_number, status, customer_name, total_mad, created_at",
      { count: "exact" }
    )
    .eq("store_id", storeId)
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

  const baseParams = new URLSearchParams({ store: storeId })
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

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Commandes</h1>
        <p className="text-sm text-muted-foreground">
          Suivez les commandes COD et mettez a jour leur statut.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Recherchez par numero ou nom client.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <input type="hidden" name="store" value={storeId} />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Rechercher une commande"
              className="rounded-lg"
            />
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmee</option>
              <option value="shipped">Expediee</option>
              <option value="delivered">Livree</option>
              <option value="returned">Retournee</option>
              <option value="cancelled">Annulee</option>
            </select>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Appliquer
            </button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium">Impossible de charger les commandes.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Actualisez la page ou reessayez dans quelques instants.
            </p>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Aucune commande pour le moment</p>
              <p className="text-sm text-muted-foreground">
                Les commandes apparaissent quand un client valide son panier.
              </p>
            </div>
            <Link
              href={`/dashboard/products?store=${storeId}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <PlusCircle className="me-2 h-4 w-4" />
              Ajouter un produit
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <OrdersTable orders={orders} storeId={storeId} />
          </CardContent>
        </Card>
      )}

      {!error && orders.length > 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {offset + 1}-{Math.min(offset + orders.length, total)} sur {total}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={prevHref}
              aria-disabled={!hasPrev}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                "rounded-lg",
                !hasPrev && "pointer-events-none opacity-50"
              )}
            >
              Precedent
            </Link>
            <Link
              href={nextHref}
              aria-disabled={!hasNext}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                "rounded-lg",
                !hasNext && "pointer-events-none opacity-50"
              )}
            >
              Suivant
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

