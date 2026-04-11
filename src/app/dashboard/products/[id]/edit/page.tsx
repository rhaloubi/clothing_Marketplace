import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id, name, description, category, base_price, compare_price, images, is_active, is_featured, slug, meta_title, meta_description"
    )
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle()

  if (error || !product) notFound()

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <Link
          href={`/dashboard/products?store=${storeId}`}
          className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="me-1 h-4 w-4" />
          Retour aux produits
        </Link>
        <h1 className="text-2xl font-semibold">Modifier le produit</h1>
        <p className="text-sm text-muted-foreground">Mettez à jour les informations du produit.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{product.name}</CardTitle>
          <CardDescription>Les changements seront visibles après enregistrement.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            key={id}
            mode="edit"
            storeId={storeId}
            productId={id}
            initialValues={{
              name: product.name,
              description: product.description,
              category: product.category,
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
        </CardContent>
      </Card>
    </div>
  )
}

