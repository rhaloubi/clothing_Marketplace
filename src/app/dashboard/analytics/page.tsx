import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import {
  AnalyticsCompareView,
  AnalyticsUpgradeRequired,
} from "@/components/dashboard/analytics/analytics-compare-view"
import { fetchAnalyticsRevenueCompareSnapshot } from "@/lib/server/analytics-compare"
import type { Database } from "@/types/database.types"
import type { AnalyticsComparePreset } from "@/types"
import { analyticsWindowQuerySchema } from "@/lib/validations"

type PlanRow = Database["public"]["Tables"]["plans"]["Row"]

type SearchParams = Promise<{ store?: string; preset?: string; from?: string; to?: string }>

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const parsedWindow = analyticsWindowQuerySchema.safeParse({
    store_id: params.store,
    preset: params.preset,
    from: params.from,
    to: params.to,
  })
  if (!parsedWindow.success) redirect("/dashboard")
  const storeId = parseStoreId(parsedWindow.data.store_id)
  if (!storeId) redirect("/dashboard")
  const preset = parsedWindow.data.preset as AnalyticsComparePreset

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: subRow, error: subErr } = await supabase
    .from("subscriptions")
    .select("*, plans(has_analytics)")
    .eq("user_id", user.id)
    .maybeSingle()

  if (subErr || !subRow) notFound()

  const planJoined = subRow.plans as Pick<PlanRow, "has_analytics"> | null
  const hasAnalytics = planJoined?.has_analytics === true

  if (!hasAnalytics) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 py-8 sm:px-0 sm:py-10">
        <AnalyticsUpgradeRequired storeId={storeId} />
      </div>
    )
  }

  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", storeId)
    .maybeSingle()

  if (storeErr || store?.user_id !== user.id) {
    redirect("/dashboard")
  }

  let snapshot = null as Awaited<ReturnType<typeof fetchAnalyticsRevenueCompareSnapshot>> | null
  try {
    snapshot = await fetchAnalyticsRevenueCompareSnapshot(supabase, storeId, preset, {
      from: parsedWindow.data.from,
      to: parsedWindow.data.to,
    })
  } catch {
    snapshot = null
  }

  if (!snapshot) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-stripe-body">
          Impossible de charger les statistiques. Réessayez plus tard.
        </p>
      </div>
    )
  }

  return (
    <AnalyticsCompareView
      storeId={storeId}
      snapshot={snapshot}
      preset={preset}
      from={parsedWindow.data.from}
      to={parsedWindow.data.to}
    />
  )
}
