"use client"

import { useMemo, useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { CategoryWithCount } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CategoryLite = Pick<CategoryWithCount, "id" | "name" | "product_count">

export function CreateCategoryDialog({
  open,
  onOpenChange,
  storeId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  onCreated: (category: CategoryWithCount) => void
}) {
  const [name, setName] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Le nom est requis.")
      return
    }

    setPending(true)
    setError(null)
    try {
      const created = await apiFetch<CategoryWithCount>("/api/categories", {
        method: "POST",
        body: JSON.stringify({ store_id: storeId, name: trimmed }),
        redirectOnUnauthorized: true,
      })
      toast.success("Catégorie créée")
      setName("")
      onOpenChange(false)
      onCreated(created)
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(e.fields?.name ?? e.message)
      } else {
        setError("Impossible de créer la catégorie.")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setName("")
          setError(null)
        }
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter une catégorie</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-category-name">Nom de la catégorie</Label>
            <Input
              id="new-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex : Homme"
              className="mt-1.5"
            />
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-stripe-purple text-white hover:bg-stripe-purple-hover"
            disabled={pending}
            onClick={() => void submit()}
          >
            {pending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            Créer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: CategoryLite | null
  onUpdated: () => void
}) {
  const [name, setName] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryId = category?.id ?? null
  const title = useMemo(() => category?.name ?? "Catégorie", [category])

  async function submit() {
    if (!categoryId) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Le nom est requis.")
      return
    }

    setPending(true)
    setError(null)
    try {
      await apiFetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
        redirectOnUnauthorized: true,
      })
      toast.success("Catégorie modifiée")
      onOpenChange(false)
      onUpdated()
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(e.fields?.name ?? e.message)
      } else {
        setError("Impossible de modifier la catégorie.")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null)
        if (o && category) setName(category.name)
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Modifier la catégorie</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-category-name">Nom de la catégorie</Label>
            <Input
              id="edit-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={title}
              className="mt-1.5"
            />
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-stripe-purple text-white hover:bg-stripe-purple-hover"
            disabled={pending || !categoryId}
            onClick={() => void submit()}
          >
            {pending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: CategoryLite | null
  onDeleted: () => void
}) {
  const [pending, setPending] = useState(false)
  const categoryId = category?.id ?? null

  async function submit() {
    if (!categoryId) return
    setPending(true)
    try {
      await apiFetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
        redirectOnUnauthorized: true,
      })
      toast.success("Catégorie supprimée")
      onOpenChange(false)
      onDeleted()
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message)
      else toast.error("Impossible de supprimer la catégorie.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer la catégorie</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-stripe-body">
          <p>
            Vous allez supprimer <span className="font-medium text-stripe-heading">{category?.name}</span>.
          </p>
          {category && category.product_count > 0 ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
              <p className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Cette catégorie est utilisée par {category.product_count} produit
                  {category.product_count > 1 ? "s" : ""}. Après suppression, ces produits seront
                  non classés.
                </span>
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void submit()}>
            {pending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            Supprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
