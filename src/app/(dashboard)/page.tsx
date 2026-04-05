import { parseStoreId } from "@/lib/dashboard"

type SearchParams = Promise<{ store?: string }>

/**
 * Dashboard home. No feature UI yet — validates `store` query param only.
 * Next: store picker when missing, KPI overview when present.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { store: storeRaw } = await searchParams
  const storeId = parseStoreId(storeRaw)

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Tableau de bord</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {storeId
          ? `Boutique active : ${storeId}`
          : "Aucune boutique sélectionnée — le paramètre d’URL « store » (UUID) est requis. Prochaine étape : sélecteur de boutique."}
      </p>
    </main>
  )
}
