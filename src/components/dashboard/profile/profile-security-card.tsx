import Link from "next/link"
import { Shield } from "lucide-react"
import { dashboardLinkOutline } from "@/components/dashboard/dashboard-page"
import { cn } from "@/lib/utils"

export function ProfileSecurityCard() {
  return (
    <section className="rounded-md border border-stripe-border bg-white p-4 shadow-stripe-card sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stripe-purple-muted/40 text-stripe-purple">
          <Shield className="h-4 w-4" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-stripe-heading">Sécurité</h2>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-stripe-heading">Mot de passe</p>
          <p className="text-sm text-stripe-body">
            Réinitialisez-le via un lien envoyé à votre e-mail.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className={cn(dashboardLinkOutline, "h-11 min-h-11 shrink-0 px-4 text-center")}
        >
          Changer le mot de passe
        </Link>
      </div>
    </section>
  )
}
