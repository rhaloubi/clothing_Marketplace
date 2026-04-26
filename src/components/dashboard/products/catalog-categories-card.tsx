import Link from "next/link"
import { ChevronRight, Shapes } from "lucide-react"
import type { CategoryWithCount } from "@/types"
import { cn } from "@/lib/utils"

export function CatalogCategoriesCard({
  storeId,
  rows,
}: {
  storeId: string
  rows: CategoryWithCount[]
}) {
  const base = `/dashboard/products?store=${storeId}`

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-xl border border-stripe-border bg-white shadow-stripe-card">
      <div className="flex items-center gap-2 border-b border-stripe-border px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stripe-purple/10 text-stripe-purple">
          <Shapes className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-stripe-heading">Rayons du catalogue</h2>
          <p className="text-xs text-stripe-body">Filtrer vos produits par rayon</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-2 py-2">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-stripe-label">
          Vos rayons
        </p>
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-stripe-body">
            Aucune catégorie créée. Ajoutez-en une via la page déclinaisons.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {rows.map((row) => {
              const href = `${base}&category=${encodeURIComponent(row.id)}`
              return (
                <li key={row.id}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-2.5 text-start transition-colors",
                      "hover:bg-stripe-canvas/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-stripe-border bg-stripe-canvas/50 text-stripe-label">
                      <Shapes className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-stripe-heading">
                        {row.name}
                      </span>
                      <span className="text-xs text-stripe-body">
                        {row.product_count} produit{row.product_count !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stripe-label" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-auto border-t border-stripe-border pt-3">
          <Link
            href={base}
            className="flex h-11 w-full items-center justify-center rounded-lg border border-stripe-border bg-stripe-canvas/40 text-sm font-medium text-stripe-heading transition-colors hover:bg-stripe-canvas"
          >
            Voir tout le catalogue
          </Link>
        </div>
      </div>
    </div>
  )
}
