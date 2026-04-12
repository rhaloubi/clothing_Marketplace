import { redirect } from "next/navigation"
import { parseStoreId } from "@/lib/dashboard"
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

  return <ProductForm key={`create-${storeId}`} mode="create" storeId={storeId} />
}
