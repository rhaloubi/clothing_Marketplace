import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import { fetchStoreCategories } from "@/lib/server/catalog"
import { ProductForm } from "@/components/dashboard/products/product-form"

type PageParams = Promise<{ id: string }>
type SearchParams = Promise<{ store?: string }>

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: PageParams
  searchParams: SearchParams
}) {
  const { id } = await params
  const q = await searchParams
  const storeId = parseStoreId(q.store)
  if (!storeId) redirect("/dashboard")

  const supabase = await createClient()
  const [{ data: product, error }, storeCategories] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, description, category_id, base_price, compare_price, images, is_active, is_featured, slug, meta_title, meta_description"
      )
      .eq("id", id)
      .eq("store_id", storeId)
      .maybeSingle(),
    fetchStoreCategories(supabase, storeId).catch(() => []),
  ])

  if (error ?? !product) notFound()

  return (
    <ProductForm
      key={id}
      mode="edit"
      storeId={storeId}
      productId={id}
      breadcrumbLabel={product.name}
      storeCategories={storeCategories}
      initialValues={{
        name: product.name,
        description: product.description,
        category_id: product.category_id,
        base_price: product.base_price,
        compare_price: product.compare_price,
        images: product.images ?? [],
        is_active: product.is_active,
        is_featured: product.is_featured,
        slug: product.slug,
        meta_title: product.meta_title,
        meta_description: product.meta_description,
      }}
    />
  )
}

