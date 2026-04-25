import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import {
  fetchAttributeDefinitionUsageCounts,
  fetchProductWithVariants,
  fetchStoreAttributeDefinitionsWithValues,
  fetchStoreCategorySummary,
} from "@/lib/server/catalog"
import { AttributeDefinitionsSection } from "@/components/dashboard/products/attribute-definitions-section"
import { CatalogCategoriesCard } from "@/components/dashboard/products/catalog-categories-card"
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
  if (!bundle?.store_id || bundle.store_id !== storeId) notFound()

  const [storeAttributes, usageByDefId, categorySummary] = await Promise.all([
    fetchStoreAttributeDefinitionsWithValues(supabase, storeId),
    fetchAttributeDefinitionUsageCounts(supabase, storeId),
    fetchStoreCategorySummary(supabase, storeId),
  ])

  return (
    <div className="space-y-8">
      <nav
        aria-label="Fil d'Ariane"
        className="flex flex-wrap items-center gap-1 text-xs font-medium uppercase tracking-wide text-stripe-label"
      >
        <Link
          href={`/dashboard/products?store=${storeId}`}
          className="text-stripe-purple hover:text-stripe-purple-hover"
        >
          Catalogue
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stripe-border" aria-hidden />
        <Link
          href={`/dashboard/products/${productId}/edit?store=${storeId}`}
          className="hover:text-stripe-heading"
        >
          {bundle.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stripe-border" aria-hidden />
        <span className="text-stripe-heading">Options et déclinaisons</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl font-medium tracking-tight text-stripe-heading md:text-3xl">
              Options et déclinaisons
            </h1>
            <p className="text-sm leading-relaxed text-stripe-body">
              Gérez les options partagées de votre boutique (taille, couleur, etc.), puis les combinaisons
              stock et prix pour <span className="font-medium text-stripe-heading">{bundle.name}</span>.
            </p>
          </div>
          <Link
            href={`/dashboard/products/${productId}/variants/new?store=${storeId}`}
            className="inline-flex h-11 min-h-11 shrink-0 items-center justify-center self-start rounded-lg border border-transparent bg-stripe-purple px-4 text-sm font-medium text-white transition-colors hover:bg-stripe-purple-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/30"
          >
            Ajouter une déclinaison
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8">
          <AttributeDefinitionsSection
            storeId={storeId}
            definitions={storeAttributes}
            usageByDefinitionId={usageByDefId}
          />
        </div>
        <div className="lg:col-span-4">
          <CatalogCategoriesCard storeId={storeId} rows={categorySummary} />
        </div>
      </div>

      <section id="declinaisons" className="scroll-mt-8 space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stripe-heading">Déclinaisons de ce produit</h2>
            <p className="text-sm text-stripe-body">
              Chaque ligne est une combinaison vendue avec son stock et son prix.
            </p>
          </div>
        </div>
        <VariantsTable
          productId={productId}
          storeId={storeId}
          basePriceMad={bundle.base_price}
          variants={bundle.variants}
        />
      </section>
    </div>
  )
}
