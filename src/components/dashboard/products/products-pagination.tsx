import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

function pageHref(base: URLSearchParams, page: number): string {
  const p = new URLSearchParams(base.toString())
  if (page <= 1) {
    p.delete("page")
  } else {
    p.set("page", String(page))
  }
  const q = p.toString()
  return q ? `/dashboard/products?${q}` : "/dashboard/products"
}

export function ProductsPaginationBar({
  storeId,
  currentPage,
  pageSize,
  total,
  baseParams,
}: {
  storeId: string
  currentPage: number
  pageSize: number
  total: number
  baseParams: URLSearchParams
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)

  const navBase = new URLSearchParams(baseParams.toString())
  navBase.set("store", storeId)

  const prevPage = safePage - 1
  const nextPage = safePage + 1

  const windowSize = 5
  let startPage = Math.max(1, safePage - Math.floor(windowSize / 2))
  let endPage = Math.min(totalPages, startPage + windowSize - 1)
  if (endPage - startPage + 1 < windowSize) {
    startPage = Math.max(1, endPage - windowSize + 1)
  }
  const pageNumbers: number[] = []
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-xs font-medium uppercase tracking-wide text-stripe-label">
        Affichage{" "}
        <span className="tabular-nums-stripe text-stripe-heading">
          {from} – {to}
        </span>{" "}
        sur{" "}
        <span className="tabular-nums-stripe text-stripe-heading">{total}</span>{" "}
        produits
      </p>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href={pageHref(navBase, prevPage)}
            aria-disabled={safePage <= 1}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-[4px] border border-stripe-border bg-white text-stripe-heading shadow-sm transition-colors hover:bg-stripe-canvas",
              safePage <= 1 && "pointer-events-none opacity-40"
            )}
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>

          {pageNumbers.map((n) => {
            const active = n === safePage
            return (
              <Link
                key={n}
                href={pageHref(navBase, n)}
                className={cn(
                  "inline-flex h-11 min-w-11 items-center justify-center rounded-[4px] px-3 text-sm font-medium tabular-nums-stripe transition-colors",
                  active
                    ? "bg-stripe-purple text-white shadow-sm hover:bg-stripe-purple-hover"
                    : "border border-stripe-border bg-white text-stripe-heading shadow-sm hover:bg-stripe-canvas"
                )}
                aria-current={active ? "page" : undefined}
              >
                {n}
              </Link>
            )
          })}

          <Link
            href={pageHref(navBase, nextPage)}
            aria-disabled={safePage >= totalPages}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-[4px] border border-stripe-border bg-white text-stripe-heading shadow-sm transition-colors hover:bg-stripe-canvas",
              safePage >= totalPages && "pointer-events-none opacity-40"
            )}
            aria-label="Page suivante"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  )
}
