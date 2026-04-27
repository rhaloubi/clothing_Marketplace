"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { dashboardLinkPrimary } from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import { formatDate, formatPrice } from "@/lib/utils"
import type { Plan, PlanName, SubscriptionWithPlan } from "@/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  cancelled: "Annulé",
  expired: "Expiré",
  past_due: "Paiement en retard",
}

const STATUS_BADGE: Record<string, string> = {
  active: "border-[rgba(21,190,83,0.35)] bg-[rgba(21,190,83,0.12)] text-stripe-success-text",
  cancelled: "border-stripe-border bg-stripe-canvas text-stripe-label",
  expired: "border-amber-200 bg-amber-50 text-amber-900",
  past_due: "border-red-200 bg-red-50 text-red-800",
}

function planTitle(name: PlanName): string {
  switch (name) {
    case "starter":
      return "Starter"
    case "growth":
      return "Growth"
    case "pro":
      return "Pro"
    default:
      return name
  }
}

export function ProfileSubscriptionSidebar({
  storeId,
  subscription,
  plans,
}: {
  storeId: string | null
  subscription: SubscriptionWithPlan
  plans: Plan[]
}) {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null)
  const current = subscription.plan.name
  const status = subscription.status
  const statusLabel = STATUS_LABEL[status] ?? status
  const badgeClass = STATUS_BADGE[status] ?? STATUS_BADGE.cancelled

  async function changePlan(planName: PlanName) {
    if (planName === current) return
    setLoadingPlan(planName)
    try {
      await apiFetch("/api/subscription", {
        method: "PATCH",
        body: JSON.stringify({ plan_name: planName }),
        redirectOnUnauthorized: true,
      })
      toast.success("Formule mise à jour.")
      router.refresh()
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "Changement impossible."
      )
    } finally {
      setLoadingPlan(null)
    }
  }

  const otherPlans = plans.filter((p) => p.name !== current)

  return (
    <div className="min-w-0 space-y-4">
      <section className="min-w-0 overflow-hidden rounded-md border border-stripe-border bg-white p-4 shadow-stripe-card sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-stripe-label">
            Mon abonnement
          </p>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-medium",
              badgeClass
            )}
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-lg font-semibold text-stripe-heading">
          Formule {planTitle(current)}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums-stripe text-stripe-heading">
          {formatPrice(subscription.plan.price_mad)}
          <span className="text-sm font-normal text-stripe-body"> / mois</span>
        </p>
        <p className="mt-3 text-sm text-stripe-body">
          Prochain renouvellement :{" "}
          <span className="font-medium text-stripe-heading">
            {formatDate(subscription.current_period_end)}
          </span>
        </p>
        <p className="mt-2 text-xs text-stripe-body">
          Paiement en ligne (CMI) à venir — facturation hors plateforme pour
          l’instant.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {otherPlans.map((p) => (
            <Button
              key={p.id}
              type="button"
              disabled={loadingPlan !== null}
              onClick={() => void changePlan(p.name)}
              className={cn(
                dashboardLinkPrimary,
                "h-11 min-h-11 w-full justify-center border-0"
              )}
            >
              {loadingPlan === p.name ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                `Passer à ${planTitle(p.name)}`
              )}
            </Button>
          ))}
        </div>

        <p className="mt-3 text-center text-xs text-stripe-body">
          Factures :{" "}
          <span className="text-stripe-label">Bientôt disponible</span>
        </p>
      </section>

      {subscription.plan.has_analytics ? (
        <section className="overflow-hidden rounded-md border border-stripe-border bg-stripe-heading text-white shadow-stripe-card">
          <div className="space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Aller plus loin
            </p>
            <p className="text-sm font-medium leading-snug">
              Explorez les statistiques de vos boutiques dans l’onglet
              Statistiques.
            </p>
            <Link
              href={
                storeId
                  ? `/dashboard/analytics?store=${storeId}`
                  : "/dashboard/analytics"
              }
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md bg-white text-sm font-medium text-stripe-heading shadow-sm transition-colors hover:bg-stripe-canvas"
            >
              Voir les statistiques
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}
