import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parseStoreId } from "@/lib/dashboard"
import { ProfilePersonalForm } from "@/components/dashboard/profile/profile-personal-form"
import { ProfilePlanComparison } from "@/components/dashboard/profile/profile-plan-comparison"
import { ProfileSecurityCard } from "@/components/dashboard/profile/profile-security-card"
import { ProfileSubscriptionSidebar } from "@/components/dashboard/profile/profile-subscription-sidebar"
import type { Database } from "@/types/database.types"
import type {
  MerchantProfile,
  Plan,
  PlanName,
  ProfilePageData,
  SubscriptionStatus,
  SubscriptionWithPlan,
} from "@/types"

type PlanRow = Database["public"]["Tables"]["plans"]["Row"]

function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name as PlanName,
    price_mad: row.price_mad,
    max_stores: row.max_stores,
    max_products: row.max_products,
    has_custom_domain: row.has_custom_domain,
    has_analytics: row.has_analytics,
    has_whatsapp: row.has_whatsapp,
    has_staff: row.has_staff,
    has_api: row.has_api,
  }
}

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "cancelled",
  "expired",
  "past_due",
]

function parseSubscriptionStatus(raw: string): SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(raw as SubscriptionStatus)
    ? (raw as SubscriptionStatus)
    : "active"
}

type SearchParams = Promise<{ store?: string }>

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const storeId = parseStoreId(params.store)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) notFound()

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileErr || !profileRow) notFound()

  const { data: subRow, error: subErr } = await supabase
    .from("subscriptions")
    .select("*, plans(*)")
    .eq("user_id", user.id)
    .single()

  if (subErr || !subRow) notFound()

  const planJoined = subRow.plans as PlanRow | null
  if (!planJoined) notFound()

  const { data: planRows, error: plansErr } = await supabase
    .from("plans")
    .select("*")
    .order("price_mad", { ascending: true })

  if (plansErr || !planRows?.length) notFound()

  const profile: MerchantProfile = {
    id: profileRow.id,
    full_name: profileRow.full_name,
    phone: profileRow.phone,
    avatar_url: profileRow.avatar_url,
    created_at: profileRow.created_at,
    updated_at: profileRow.updated_at,
  }

  const subscription: SubscriptionWithPlan = {
    id: subRow.id,
    user_id: subRow.user_id,
    plan_id: subRow.plan_id,
    status: parseSubscriptionStatus(subRow.status),
    current_period_start: subRow.current_period_start,
    current_period_end: subRow.current_period_end,
    plan: toPlan(planJoined),
  }

  const data: ProfilePageData = {
    email: user.email,
    profile,
    subscription,
    plans: planRows.map(toPlan),
  }

  return (
    <div className="space-y-5 overflow-x-hidden pb-8 sm:space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-stripe-heading sm:text-3xl">
          Profil et abonnement
        </h1>
        <p className="max-w-2xl text-xs text-stripe-body sm:text-sm">
          Gérez les détails de votre compte marchand et suivez votre formule.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:gap-8 xl:grid-cols-[1fr_minmax(280px,340px)] xl:items-start">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <ProfilePersonalForm email={data.email} profile={data.profile} />
          <ProfileSecurityCard />
          <ProfilePlanComparison plans={data.plans} />
        </div>
        <div className="min-w-0">
          <ProfileSubscriptionSidebar
            storeId={storeId}
            subscription={data.subscription}
            plans={data.plans}
          />
        </div>
      </div>
    </div>
  )
}
