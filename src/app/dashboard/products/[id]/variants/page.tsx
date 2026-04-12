import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import { fetchProductWithVariants } from "@/lib/server/catalog"
import { VariantsTable } from "@/components/dashboard/products/variants-table"

type PageParams = Promise<{ id: string }>
type SearchParams = Promise<{ store?: string }>

export default async function ProductVariantsPage({
  params,
  searchParams,
}: {
  params: PageParams
  searchParams: SearchParams
}) {
  const { id: productId } = await params
  const { store } = await searchParams
  const storeId = parseStoreId(store)
  if (!storeId) redirect("/dashboard")

  const supabase = await createClient()
  const bundle = await fetchProductWithVariants(supabase, productId)
  if (!bundle || bundle.store_id !== storeId) notFound()

  return (
    <div className="space-y-6">
      <nav
        aria-label="Fil d'Ariane"
        className="flex flex-wrap items-center gap-1 text-xs font-medium uppercase tracking-wide text-stripe-body"
      >
        <Link
          href={`/dashboard/products?store=${storeId}`}
          className="hover:text-stripe-heading"
        >
          Catalogue
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        <Link
          href={`/dashboard/products/${productId}/edit?store=${storeId}`}
          className="hover:text-stripe-heading"
        >
          {bundle.name}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        <span className="text-stripe-label">Déclinaisons</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-stripe-heading">
            Déclinaisons
          </h1>
          <p className="mt-1 text-sm text-stripe-body">{bundle.name}</p>
        </div>
        <Link
          href={`/dashboard/products/${productId}/variants/new?store=${storeId}`}
          className="inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-stripe-purple px-4 text-sm font-medium text-white transition-colors hover:bg-stripe-purple-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/30"
        >
          Ajouter une déclinaison
        </Link>
      </div>

      <VariantsTable
        productId={productId}
        storeId={storeId}
        basePriceMad={bundle.base_price}
        variants={bundle.variants}
      />
    </div>
  )
}
