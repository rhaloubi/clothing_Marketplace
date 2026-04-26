"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronRight, MoreVertical, Plus, Shapes } from "lucide-react"
import type { CategoryWithCount } from "@/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CreateCategoryDialog,
  DeleteCategoryDialog,
  EditCategoryDialog,
} from "@/components/dashboard/products/inline-category-dialogs"

export function CatalogCategoriesCard({
  storeId,
  rows,
}: {
  storeId: string
  rows: CategoryWithCount[]
}) {
  const router = useRouter()
  const base = `/dashboard/products?store=${storeId}`
  const [newOpen, setNewOpen] = useState(false)
  const [editFor, setEditFor] = useState<CategoryWithCount | null>(null)
  const [deleteFor, setDeleteFor] = useState<CategoryWithCount | null>(null)

  function onMutated() {
    router.refresh()
  }

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
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stripe-label">
            Vos rayons
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-md border-stripe-border text-xs"
            onClick={() => setNewOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
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
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg px-1.5 py-1 transition-colors",
                      "hover:bg-stripe-canvas/80"
                    )}
                  >
                    <Link
                      href={href}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-start",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
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
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100"
                            aria-label={`Actions pour ${row.name}`}
                          />
                        }
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setEditFor(row)}>
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteFor(row)}
                        >
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
      <CreateCategoryDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        storeId={storeId}
        onCreated={() => onMutated()}
      />
      <EditCategoryDialog
        open={!!editFor}
        onOpenChange={(o) => {
          if (!o) setEditFor(null)
        }}
        category={editFor}
        onUpdated={() => {
          setEditFor(null)
          onMutated()
        }}
      />
      <DeleteCategoryDialog
        open={!!deleteFor}
        onOpenChange={(o) => {
          if (!o) setDeleteFor(null)
        }}
        category={deleteFor}
        onDeleted={() => {
          setDeleteFor(null)
          onMutated()
        }}
      />
    </div>
  )
}
