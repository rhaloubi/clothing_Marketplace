"use client"

import type { LucideIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Filter, LayoutGrid, ListFilter, Package } from "lucide-react"
import {
  dashboardFilterInputClass,
  dashboardFilterSelectClass,
} from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actifs" },
  { value: "draft", label: "Brouillons" },
] as const

const STOCK_OPTIONS = [
  { value: "all", label: "Tous les stocks" },
  { value: "low", label: "Stock bas" },
  { value: "out", label: "Rupture" },
  { value: "ok", label: "Stock suffisant" },
] as const

function SelectShell({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-11 min-w-0 flex-1 items-center gap-2 sm:max-w-[220px] sm:flex-initial",
        className
      )}
    >
      <Icon
        className="pointer-events-none absolute start-3 z-10 h-4 w-4 text-stripe-label"
        aria-hidden
      />
      {children}
    </div>
  )
}

export function ProductsFiltersBar({
  storeId,
  categories,
  category,
  status,
  stock,
  query,
}: {
  storeId: string
  categories: string[]
  category: string
  status: string
  stock: string
  query: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [moreOpen, setMoreOpen] = useState(Boolean(query))
  const [draftQ, setDraftQ] = useState(query)

  useEffect(() => {
    setDraftQ(query)
  }, [query])

  const base = useMemo(() => {
    const p = new URLSearchParams(searchParams.toString())
    p.set("store", storeId)
    return p
  }, [searchParams, storeId])

  function pushWithUpdates(updates: Record<string, string | undefined>) {
    const p = new URLSearchParams(base.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") {
        p.delete(k)
      } else {
        p.set(k, v)
      }
    }
    p.delete("offset")
    p.delete("page")
    router.push(`/dashboard/products?${p.toString()}`)
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SelectShell icon={LayoutGrid}>
          <select
            className={cn(dashboardFilterSelectClass, "w-full ps-9")}
            value={category}
            aria-label="Catégorie"
            onChange={(e) => pushWithUpdates({ category: e.target.value || undefined })}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </SelectShell>

        <SelectShell icon={ListFilter}>
          <select
            className={cn(dashboardFilterSelectClass, "w-full ps-9")}
            value={status}
            aria-label="Statut"
            onChange={(e) => {
              const v = e.target.value
              pushWithUpdates({ status: v === "all" ? undefined : v })
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </SelectShell>

        <SelectShell icon={Package}>
          <select
            className={cn(dashboardFilterSelectClass, "w-full ps-9")}
            value={stock}
            aria-label="Niveau de stock"
            onChange={(e) => {
              const v = e.target.value
              pushWithUpdates({ stock: v === "all" ? undefined : v })
            }}
          >
            {STOCK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </SelectShell>
        </div>

        <Button
          type="button"
          variant="outline"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((o) => !o)}
          className="h-11 min-h-11 w-full shrink-0 gap-2 rounded-[4px] border-stripe-border bg-white text-stripe-heading shadow-sm hover:bg-stripe-canvas sm:w-auto"
        >
          <Filter className="h-4 w-4 text-stripe-label" aria-hidden />
          Plus de filtres
          <ChevronDown
            className={cn(
              "h-4 w-4 text-stripe-label transition-transform",
              moreOpen && "rotate-180"
            )}
            aria-hidden
          />
        </Button>
      </div>

      {moreOpen ? (
        <div className="w-full rounded-[4px] border border-stripe-border bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stripe-label">
            Recherche
          </p>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              pushWithUpdates({ q: draftQ.trim() || undefined })
            }}
          >
            <Input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="Nom, catégorie…"
              className={cn(dashboardFilterInputClass, "min-h-11 flex-1")}
              name="q"
            />
            <Button
              type="submit"
              className="h-11 min-h-11 shrink-0 rounded-[4px] bg-stripe-purple hover:bg-stripe-purple-hover"
            >
              Appliquer
            </Button>
          </form>
          {query ? (
            <button
              type="button"
              className="mt-2 text-sm text-stripe-purple hover:underline"
              onClick={() => {
                setDraftQ("")
                pushWithUpdates({ q: undefined })
              }}
            >
              Effacer la recherche
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
