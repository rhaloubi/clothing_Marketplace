import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import { PlusCircle, Store } from "lucide-react"
import Link from "next/link"
import { DashboardErrorCard } from "@/components/dashboard/dashboard-page"
import { DashboardHomeView } from "@/components/dashboard/home/dashboard-home-view"
import { fetchDashboardHomeSnapshot } from "@/lib/server/dashboard-home"

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

  let snapshot = null as Awaited<ReturnType<typeof fetchDashboardHomeSnapshot>> | null
  let loadError = false
  try {
    snapshot = await fetchDashboardHomeSnapshot(supabase, storeId)
  } catch {
    loadError = true
  }

  if (loadError || !snapshot) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-stripe-heading">
            {store.name}
          </h1>
          <p className="text-sm text-stripe-body">Vue d&apos;ensemble</p>
        </div>
        <DashboardErrorCard
          message="Impossible de charger le tableau de bord."
          hint="Actualisez la page ou réessayez dans quelques instants."
        />
      </div>
    )
  }

  return (
    <DashboardHomeView
      storeId={storeId}
      storeName={store.name}
      snapshot={snapshot}
    />
  )
}

function NoStoreEmptyState() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stripe-canvas">
        <Store className="h-6 w-6 text-stripe-label" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-stripe-heading">
          Aucune boutique pour le moment
        </h2>
        <p className="text-sm text-stripe-body">
          Créez votre première boutique pour commencer à vendre.
        </p>
      </div>
      <Link
        href="/dashboard/stores/new"
        className="inline-flex h-11 items-center justify-center rounded-md bg-stripe-purple px-4 text-sm font-medium text-white transition-colors hover:bg-stripe-purple-hover"
      >
        <PlusCircle className="me-2 h-4 w-4" aria-hidden />
        Créer ma boutique
      </Link>
    </div>
  )
}
