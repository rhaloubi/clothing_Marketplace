import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Package, PlusCircle } from "lucide-react"
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
  dashboardLinkOutline,
  dashboardLinkPrimary,
} from "@/components/dashboard/dashboard-page"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  ProductsTable,
  type ProductTableRow,
} from "@/components/dashboard/products/products-table"

type SearchParams = Promise<{
  store?: string
  q?: string
  offset?: string
}>

const PAGE_SIZE = 20

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const storeId = parseStoreId(params.store)
  if (!storeId) redirect("/dashboard")

  const query = (params.q ?? "").trim()
  const offsetRaw = Number.parseInt(params.offset ?? "0", 10)
  const offset = Number.isNaN(offsetRaw) ? 0 : Math.max(0, offsetRaw)

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Produits"
        description="Gérez votre catalogue et mettez à jour vos produits."
        actions={
          <Link href={`/dashboard/products/new?store=${storeId}`} className={dashboardLinkPrimary}>
            <PlusCircle className="h-4 w-4 shrink-0" aria-hidden />
            Ajouter un produit
          </Link>
        }
      />

      <DashboardPanelCard
        title="Filtrer"
        description="Recherchez un produit par nom, slug ou catégorie."
      >
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="store" value={storeId} />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Rechercher un produit"
            className={cn(dashboardFilterInputClass)}
          />
          <button type="submit" className={dashboardLinkOutline}>
            Appliquer
          </button>
        </form>
      </DashboardPanelCard>

      <Suspense key={`${storeId}:${query}:${offset}`} fallback={<ProductsContentSkeleton />}>
        <ProductsContent storeId={storeId} query={query} offset={offset} />
      </Suspense>
    </div>
  )
}

async function ProductsContent({
  storeId,
  query,
  offset,
}: {
  storeId: string
  query: string
  offset: number
}) {
  const supabase = await createClient()

  let productQuery = supabase
    .from("products")
    .select("id, name, slug, category, base_price, is_active, is_featured, created_at", {
      count: "exact",
    })
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (query) {
    const escaped = query.replaceAll(",", "\\,")
    productQuery = productQuery.or(
      `name.ilike.%${escaped}%,slug.ilike.%${escaped}%,category.ilike.%${escaped}%`
    )
  }

  const { data, error, count } = await productQuery
  const products = (data ?? []) as ProductTableRow[]
  const total = count ?? 0

  const baseParams = new URLSearchParams({ store: storeId })
  if (query) baseParams.set("q", query)

  const prevOffset = Math.max(0, offset - PAGE_SIZE)
  const nextOffset = offset + PAGE_SIZE
  const hasPrev = offset > 0
  const hasNext = nextOffset < total

  const prevHref = (() => {
    const p = new URLSearchParams(baseParams)
    p.set("offset", String(prevOffset))
    return `/dashboard/products?${p.toString()}`
  })()

  const nextHref = (() => {
    const p = new URLSearchParams(baseParams)
    p.set("offset", String(nextOffset))
    return `/dashboard/products?${p.toString()}`
  })()

  if (error) {
    return (
      <DashboardErrorCard
        message="Impossible de charger les produits."
        hint="Actualisez la page ou réessayez dans quelques instants."
      />
    )
  }

  if (products.length === 0) {
    return (
      <DashboardEmptyState
        icon={Package}
        title="Aucun produit pour le moment"
        description="Commencez par ajouter votre premier produit au catalogue."
        action={{
          href: `/dashboard/products/new?store=${storeId}`,
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
          <ProductsTable products={products} storeId={storeId} />
        </div>
      </DashboardTableCard>

      <DashboardPaginationBar
        summary={`${offset + 1}-${Math.min(offset + products.length, total)} sur ${total}`}
        prevHref={prevHref}
        nextHref={nextHref}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    </>
  )
}

function ProductsContentSkeleton() {
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
