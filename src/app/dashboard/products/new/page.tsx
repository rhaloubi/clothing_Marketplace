import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import { fetchStoreCategories } from "@/lib/server/catalog"
import { ProductForm } from "@/components/dashboard/products/product-form"

type SearchParams = Promise<{ store?: string }>

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const storeId = parseStoreId(params.store)
  if (!storeId) redirect("/dashboard")

  const supabase = await createClient()
  let storeCategories: Awaited<ReturnType<typeof fetchStoreCategories>> = []
  try {
    storeCategories = await fetchStoreCategories(supabase, storeId)
  } catch {
    storeCategories = []
  }

  return (
    <ProductForm
      key={`create-${storeId}`}
      mode="create"
      storeId={storeId}
      storeCategories={storeCategories}
    />
  )
}
