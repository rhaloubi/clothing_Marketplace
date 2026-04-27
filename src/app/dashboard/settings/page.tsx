import { notFound, redirect } from "next/navigation"
import { StoreSettingsForm } from "@/components/dashboard/settings/store-settings-form"
import { parseStoreId } from "@/lib/dashboard"
import { createClient } from "@/lib/supabase/server"
import type { StoreSettingsInitialData, ShippingZoneWithWilaya, Wilaya } from "@/types"

type SearchParams = Promise<{ store?: string }>

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const storeId = parseStoreId(params.store)
  if (!storeId) redirect("/dashboard")

  const supabase = await createClient()

  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url, banner_url, whatsapp_number")
    .eq("id", storeId)
    .single()

  if (storeErr || !store) notFound()

  const { data: zoneRows, error: zErr } = await supabase
    .from("shipping_zones")
    .select("*, wilayas (*)")
    .eq("store_id", storeId)
    .order("wilaya_id", { ascending: true })

  const { data: wilayaRows, error: wErr } = await supabase
    .from("wilayas")
    .select("id, name_fr, name_ar, code")
    .order("id", { ascending: true })

  if (wErr || !wilayaRows) notFound()

  const shipping_zones: ShippingZoneWithWilaya[] = (zErr ? [] : (zoneRows ?? [])).flatMap((row) => {
    const w = row.wilayas as Wilaya | null
    if (!w) return []
    return [
      {
        id: row.id,
        store_id: row.store_id,
        wilaya_id: row.wilaya_id,
        provider_id: row.provider_id,
        price_mad: row.price_mad,
        free_shipping_threshold: row.free_shipping_threshold,
        estimated_days_min: row.estimated_days_min,
        estimated_days_max: row.estimated_days_max,
        is_active: row.is_active,
        wilaya: w,
      },
    ]
  })

  const initial: StoreSettingsInitialData = {
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      logo_url: store.logo_url,
      banner_url: store.banner_url,
      whatsapp_number: store.whatsapp_number,
    },
    shipping_zones,
    wilayas: wilayaRows as Wilaya[],
    rootDomain: (() => {
      const d = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim()
      return d && d.length > 0 ? d : "platform.localhost"
    })(),
  }

  return (
    <div className="space-y-8 pb-20 sm:space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-stripe-heading sm:text-3xl">
          Paramètres de la boutique
        </h1>
        <p className="text-sm text-stripe-body">
          Identité, WhatsApp et livraison pour cette boutique.
        </p>
      </div>

      <StoreSettingsForm initial={initial} />
    </div>
  )
}
