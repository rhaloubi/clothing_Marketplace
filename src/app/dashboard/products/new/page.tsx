import { redirect } from "next/navigation"
import { parseStoreId } from "@/lib/dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Ajouter un produit</h1>
        <p className="text-sm text-muted-foreground">
          Renseignez les informations principales de votre produit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau produit</CardTitle>
          <CardDescription>
            Le prix est en MAD entier. Ajoutez une ou plusieurs photos depuis votre appareil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm key={`create-${storeId}`} mode="create" storeId={storeId} />
        </CardContent>
      </Card>
    </div>
  )
}

