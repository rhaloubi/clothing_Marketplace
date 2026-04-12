import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import {
  fetchProductWithVariants,
  fetchStoreAttributeDefinitionsWithValues,
} from "@/lib/server/catalog"
import { VariantForm } from "@/components/dashboard/products/variant-form"

type PageParams = Promise<{ id: string }>
type SearchParams = Promise<{ store?: string }>

export default async function NewVariantPage({
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

  const storeAttributes = await fetchStoreAttributeDefinitionsWithValues(supabase, storeId)

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
        <Link
          href={`/dashboard/products/${productId}/variants?store=${storeId}`}
          className="hover:text-stripe-heading"
        >
          Déclinaisons
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        <span className="text-stripe-label">Nouvelle</span>
      </nav>

      <VariantForm
        mode="create"
        productId={productId}
        storeId={storeId}
        basePriceMad={bundle.base_price}
        productName={bundle.name}
        storeAttributes={storeAttributes}
      />
    </div>
  )
}
