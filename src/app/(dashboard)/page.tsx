import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import { PlusCircle, Store } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SearchParams = Promise<{ store?: string }>

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { store: storeRaw } = await searchParams
  const storeId = parseStoreId(storeRaw)

  const supabase = await createClient()

  if (!storeId) {
    const { data: stores } = await supabase
      .from("stores")
      .select("id, name, slug")
      .order("created_at", { ascending: true })
      .limit(1)

    if (stores && stores.length > 0 && stores[0]) {
      redirect(`/dashboard?store=${stores[0].id}`)
    }

    return <NoStoreEmptyState />
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, is_active")
    .eq("id", storeId)
    .maybeSingle()

  if (!store) {
    redirect("/dashboard")
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{store.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d'ensemble de votre boutique
        </p>
      </div>

      {/* Placeholder KPI grid — Phase 3 will wire analytics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Commandes", placeholder: "—" },
          { label: "Revenus", placeholder: "— MAD" },
          { label: "Produits", placeholder: "—" },
          { label: "Taux conversion", placeholder: "—" },
        ].map(({ label, placeholder }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{placeholder}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function NoStoreEmptyState() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Store className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Aucune boutique pour le moment</h2>
        <p className="text-sm text-muted-foreground">
          Créez votre première boutique pour commencer à vendre.
        </p>
      </div>
      <Link href="/dashboard/stores/new" className={cn(buttonVariants())}>
        <PlusCircle className="me-2 h-4 w-4" />
        Créer ma boutique
      </Link>
    </div>
  )
}
