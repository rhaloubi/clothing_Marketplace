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

type PageParams = Promise<{ id: string; variantId: string }>
type SearchParams = Promise<{ store?: string }>

export default async function EditVariantPage({
  params,
  searchParams,
}: {
  params: PageParams
  searchParams: SearchParams
}) {
  const { id: productId, variantId } = await params
  const { store } = await searchParams
  const storeId = parseStoreId(store)
  if (!storeId) redirect("/dashboard")

  const supabase = await createClient()
  const bundle = await fetchProductWithVariants(supabase, productId)
  if (!bundle?.store_id || bundle.store_id !== storeId) notFound()

  const variant = bundle.variants.find((v) => v.id === variantId)
  if (!variant) notFound()

  const { data: links, error: lErr } = await supabase
    .from("variant_attribute_values")
    .select("attribute_value_id")
    .eq("variant_id", variantId)

  if (lErr) notFound()

  const attribute_value_ids = (links ?? []).map((l) => l.attribute_value_id)

  const storeAttributes = await fetchStoreAttributeDefinitionsWithValues(supabase, storeId)

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
        <Link
          href={`/dashboard/products/${productId}/variants?store=${storeId}`}
          className="hover:text-stripe-heading"
        >
          Options et déclinaisons
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stripe-border" aria-hidden />
        <span className="text-stripe-heading">Modifier la déclinaison</span>
      </nav>

      <VariantForm
        mode="edit"
        productId={productId}
        storeId={storeId}
        basePriceMad={bundle.base_price}
        productName={bundle.name}
        storeAttributes={storeAttributes}
        variantId={variantId}
        initial={{
          sku: variant.sku,
          stock_quantity: variant.stock_quantity,
          price_override: variant.price_override,
          is_active: variant.is_active,
          attribute_value_ids,
        }}
      />
    </div>
  )
}
