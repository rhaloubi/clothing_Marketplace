"use client"

import * as React from "react"
import { Search, ArrowRightToLine } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const items = [
  { name: "Aperçu", path: "/dashboard" },
  { name: "Commandes", path: "/dashboard/orders" },
  { name: "Produits", path: "/dashboard/products" },
  { name: "Ajouter produit", path: "/dashboard/products/new" },
  { name: "Statistiques", path: "/dashboard/analytics" },
  { name: "Paramètres", path: "/dashboard/settings" },
  { name: "Profil", path: "/dashboard/profile" },
]

export function SearchCommand() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const store = searchParams.get("store")

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function buildPath(path: string): string {
    if (!store || path === "/dashboard/profile") return path
    const qs = new URLSearchParams({ store })
    return `${path}?${qs.toString()}`
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full max-w-[22rem] justify-start gap-2 rounded-md border-stripe-border bg-white px-3 text-sm font-normal text-stripe-body shadow-sm hover:bg-stripe-canvas hover:text-stripe-heading"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 shrink-0 text-stripe-body/70" />
        <span>Rechercher…</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px] p-0">
          <DialogTitle className="sr-only">Recherche</DialogTitle>
          <DialogDescription className="sr-only">
            Accéder rapidement aux pages du tableau de bord
          </DialogDescription>

          <div className="border-b border-stripe-border p-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-stripe-body/70" />
              <input
                className="flex-1 bg-transparent text-sm text-stripe-heading outline-none placeholder:text-stripe-body/60"
                placeholder="Rechercher une page…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-auto pb-3">
            {filteredItems.length > 0 ? (
              <>
                <div className="px-3 pt-2">
                  <p className="px-1 text-xs font-medium uppercase tracking-wide text-stripe-label">
                    Navigation
                  </p>
                </div>
                {filteredItems.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-stripe-heading hover:bg-stripe-canvas"
                    onClick={() => {
                      setOpen(false)
                      setSearchQuery("")
                      router.push(buildPath(item.path))
                    }}
                  >
                    <ArrowRightToLine className="me-2 h-4 w-4 text-stripe-body/70" />
                    <span className="flex-1">{item.name}</span>
                  </button>
                ))}
              </>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-stripe-body">Aucun résultat.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

