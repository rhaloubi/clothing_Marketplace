import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Package, PlusCircle } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
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
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Produits</h1>
          <p className="text-sm text-muted-foreground">
            Gérez votre catalogue et mettez à jour vos produits.
          </p>
        </div>
        <Link
          href={`/dashboard/products/new?store=${storeId}`}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <PlusCircle className="me-2 h-4 w-4" />
          Ajouter un produit
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrer</CardTitle>
          <CardDescription>Recherchez un produit par nom, slug ou catégorie.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="store" value={storeId} />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Rechercher un produit"
              className="rounded-lg"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Appliquer
            </button>
          </form>
        </CardContent>
      </Card>

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
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm font-medium">Impossible de charger les produits.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Actualisez la page ou reessayez dans quelques instants.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Aucun produit pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Commencez par ajouter votre premier produit au catalogue.
            </p>
          </div>
          <Link
            href={`/dashboard/products/new?store=${storeId}`}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <PlusCircle className="me-2 h-4 w-4" />
            Ajouter un produit
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="pt-4">
          <ProductsTable products={products} storeId={storeId} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {offset + 1}-{Math.min(offset + products.length, total)} sur {total}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={prevHref}
            aria-disabled={!hasPrev}
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
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
              !hasNext && "pointer-events-none opacity-50"
            )}
          >
            Suivant
          </Link>
        </div>
      </div>
    </>
  )
}

function ProductsContentSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}
