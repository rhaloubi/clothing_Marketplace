import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { ChevronRight, Package, Plus } from "lucide-react"
import {
  DashboardEmptyState,
  DashboardErrorCard,
  DashboardTableCard,
  dashboardLinkPrimary,
} from "@/components/dashboard/dashboard-page"
import { ProductsFiltersBar } from "@/components/dashboard/products/products-filters"
import { ProductsPaginationBar } from "@/components/dashboard/products/products-pagination"
import { ProductsTable } from "@/components/dashboard/products/products-table"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { parseStoreId } from "@/lib/dashboard"
import {
  fetchDashboardProductList,
  type DashboardProductListFilters,
} from "@/lib/server/products-dashboard-list"
import { fetchStoreCategories } from "@/lib/server/catalog"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { CategoryWithCount } from "@/types"

type SearchParams = Promise<{
  store?: string
  q?: string
  page?: string
  category?: string
  status?: string
  stock?: string
}>

const PAGE_SIZE = 10

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const storeId = parseStoreId(params.store)
  if (!storeId) redirect("/dashboard")

  const query = (params.q ?? "").trim()
  const category = (params.category ?? "").trim()
  const statusRaw = params.status
  const status =
    statusRaw === "active" || statusRaw === "draft" ? statusRaw : "all"
  const stockRaw = params.stock
  const stock =
    stockRaw === "low" || stockRaw === "out" || stockRaw === "ok"
      ? stockRaw
      : "all"

  const pageRaw = Number.parseInt(params.page ?? "1", 10)
  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw)

  const filters: DashboardProductListFilters = {
    query,
    category,
    status,
    stock,
  }

  const baseParams = new URLSearchParams()
  baseParams.set("store", storeId)
  if (category) baseParams.set("category", category)
  if (status !== "all") baseParams.set("status", status)
  if (stock !== "all") baseParams.set("stock", stock)
  if (query) baseParams.set("q", query)

  return (
    <div className="space-y-6">
      <nav
        className="flex flex-wrap items-center gap-1 text-xs font-medium uppercase tracking-wide text-stripe-label"
        aria-label="Fil d’Ariane"
      >
        <span className="text-stripe-purple">Catalogue</span>
        <ChevronRight className="h-3.5 w-3.5 text-stripe-border" aria-hidden />
        <span className="text-stripe-heading">Inventaire</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-stripe-heading">
            Gestion des produits
          </h1>
          <p className="max-w-2xl text-sm text-stripe-body">
            Pilotez votre inventaire avec précision. Suivi des stocks et des
            variantes pour chaque article.
          </p>
        </div>
        <Link
          href={`/dashboard/products/new?store=${storeId}`}
          className={cn(dashboardLinkPrimary, "shrink-0 gap-2")}
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          Ajouter un produit
        </Link>
      </div>

      <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0">
        <CardContent className="p-4 sm:p-5">
          <Suspense fallback={<FiltersBarSkeleton />}>
            <ProductsFiltersServer
              storeId={storeId}
              category={category}
              status={status}
              stock={stock}
              query={query}
            />
          </Suspense>
        </CardContent>
      </Card>

      <Suspense
        key={`${storeId}:${query}:${category}:${status}:${stock}:${page}`}
        fallback={<ProductsContentSkeleton />}
      >
        <ProductsContent
          storeId={storeId}
          filters={filters}
          page={page}
          baseParams={baseParams}
        />
      </Suspense>
    </div>
  )
}

async function ProductsFiltersServer({
  storeId,
  category,
  status,
  stock,
  query,
}: {
  storeId: string
  category: string
  status: string
  stock: string
  query: string
}) {
  const supabase = await createClient()
  let categories: CategoryWithCount[] = []
  try {
    categories = await fetchStoreCategories(supabase, storeId)
  } catch {
    categories = []
  }

  return (
    <ProductsFiltersBar
      storeId={storeId}
      categories={categories}
      category={category}
      status={status}
      stock={stock}
      query={query}
    />
  )
}

function FiltersBarSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Skeleton className="h-11 w-full sm:w-52" />
      <Skeleton className="h-11 w-full sm:w-52" />
      <Skeleton className="h-11 w-full sm:w-52" />
      <Skeleton className="ms-auto h-11 w-full sm:w-44" />
    </div>
  )
}

async function ProductsContent({
  storeId,
  filters,
  page,
  baseParams,
}: {
  storeId: string
  filters: DashboardProductListFilters
  page: number
  baseParams: URLSearchParams
}) {
  const supabase = await createClient()

  let rows: Awaited<
    ReturnType<typeof fetchDashboardProductList>
  >["rows"] = []
  let total = 0
  let maxStockOnPage = 1

  try {
    const result = await fetchDashboardProductList(
      supabase,
      storeId,
      filters,
      page,
      PAGE_SIZE
    )
    rows = result.rows
    total = result.total
    maxStockOnPage = result.maxStockOnPage
  } catch {
    return (
      <DashboardErrorCard
        message="Impossible de charger les produits."
        hint="Actualisez la page ou réessayez dans quelques instants."
      />
    )
  }

  if (total === 0) {
    const { count, error: cErr } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)

    const anyInStore = !cErr && (count ?? 0) > 0

    if (!anyInStore) {
      return (
        <DashboardEmptyState
          icon={Package}
          title="Aucun produit pour le moment"
          description="Commencez par ajouter votre premier produit au catalogue."
          action={{
            href: `/dashboard/products/new?store=${storeId}`,
            label: "Ajouter un produit",
            icon: Plus,
          }}
        />
      )
    }

    return (
      <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-stripe-purple-muted/40">
            <Package className="h-5 w-5 text-stripe-purple" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-stripe-heading">
              Aucun produit ne correspond à ces filtres
            </p>
            <p className="text-sm text-stripe-body">
              Élargissez la recherche ou réinitialisez les filtres.
            </p>
          </div>
          <Link
            href={`/dashboard/products?store=${storeId}`}
            className={dashboardLinkPrimary}
          >
            Réinitialiser les filtres
          </Link>
        </CardContent>
      </Card>
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (rows.length === 0 && total > 0 && page > totalPages) {
    const p = new URLSearchParams(baseParams.toString())
    p.set("store", storeId)
    if (totalPages <= 1) {
      p.delete("page")
    } else {
      p.set("page", String(totalPages))
    }
    redirect(`/dashboard/products?${p.toString()}`)
  }

  return (
    <div className="space-y-4">
      <DashboardTableCard>
        <div className="overflow-x-auto">
          <ProductsTable
            products={rows}
            storeId={storeId}
            maxStockOnPage={maxStockOnPage}
          />
        </div>
      </DashboardTableCard>

      <ProductsPaginationBar
        storeId={storeId}
        currentPage={page}
        pageSize={PAGE_SIZE}
        total={total}
        baseParams={baseParams}
      />
    </div>
  )
}

function ProductsContentSkeleton() {
  return (
    <Card className="rounded-md border border-stripe-border bg-white shadow-stripe-card ring-0">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </CardContent>
    </Card>
  )
}
