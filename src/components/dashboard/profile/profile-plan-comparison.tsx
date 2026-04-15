import type { ReactNode } from "react"
import { Check, CreditCard } from "lucide-react"
import {
  dashboardTableBodyRowClass,
  dashboardTableHeadClass,
  dashboardTableHeaderRowClass,
} from "@/components/dashboard/dashboard-page"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPrice } from "@/lib/utils"
import type { Plan, PlanName } from "@/types"

const PLAN_ORDER: PlanName[] = ["starter", "growth", "pro"]

function planLabel(name: PlanName): string {
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

function CellCheck({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto h-4 w-4 text-stripe-success" aria-label="Oui" />
  ) : (
    <span className="text-stripe-label">—</span>
  )
}

function maxProductsLabel(max: number | null): string {
  if (max === null) return "Illimité"
  return `Jusqu’à ${max}`
}

type RowDef = {
  key: string
  label: string
  get: (p: Plan) => ReactNode
}

const ROWS: RowDef[] = [
  {
    key: "products",
    label: "Produits",
    get: (p) => maxProductsLabel(p.max_products),
  },
  {
    key: "stores",
    label: "Boutiques",
    get: (p) => String(p.max_stores),
  },
  {
    key: "analytics",
    label: "Analyses",
    get: (p) => <CellCheck value={p.has_analytics} />,
  },
  {
    key: "whatsapp",
    label: "Notifications WhatsApp",
    get: (p) => <CellCheck value={p.has_whatsapp} />,
  },
  {
    key: "domain",
    label: "Domaine personnalisé",
    get: (p) => <CellCheck value={p.has_custom_domain} />,
  },
  {
    key: "staff",
    label: "Équipe (staff)",
    get: (p) => <CellCheck value={p.has_staff} />,
  },
  {
    key: "api",
    label: "Accès API",
    get: (p) => <CellCheck value={p.has_api} />,
  },
  {
    key: "price",
    label: "Prix (par mois)",
    get: (p) => (
      <span className="font-semibold tabular-nums-stripe text-stripe-heading">
        {formatPrice(p.price_mad)}
      </span>
    ),
  },
]

export function ProfilePlanComparison({ plans }: { plans: Plan[] }) {
  const ordered = [...plans].sort(
    (a, b) => PLAN_ORDER.indexOf(a.name) - PLAN_ORDER.indexOf(b.name)
  )

  return (
    <section className="rounded-md border border-stripe-border bg-white p-4 shadow-stripe-card sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stripe-purple-muted/40 text-stripe-purple">
          <CreditCard className="h-4 w-4" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-stripe-heading">
          Comparer les formules
        </h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className={dashboardTableHeaderRowClass}>
              <TableHead className={dashboardTableHeadClass}>
                Fonctionnalités
              </TableHead>
              {ordered.map((p) => (
                <TableHead
                  key={p.id}
                  className={`${dashboardTableHeadClass} text-center`}
                >
                  {planLabel(p.name).toUpperCase()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.key} className={dashboardTableBodyRowClass}>
                <TableCell className="px-3 py-3 text-sm font-medium text-stripe-heading">
                  {row.label}
                </TableCell>
                {ordered.map((p) => (
                  <TableCell
                    key={p.id}
                    className="px-3 py-3 text-center text-sm text-stripe-body"
                  >
                    {row.get(p)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
