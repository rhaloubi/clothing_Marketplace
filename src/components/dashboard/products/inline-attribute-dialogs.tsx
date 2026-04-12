"use client"

import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AttributeDisplayType } from "@/types"

type ValueRow = { label: string; value: string }

interface NewAttributeOptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  onCreated: () => void
}

export function NewAttributeOptionDialog({
  open,
  onOpenChange,
  storeId,
  onCreated,
}: NewAttributeOptionDialogProps) {
  const [name, setName] = useState("")
  const [displayType, setDisplayType] = useState<AttributeDisplayType>("select")
  const [rows, setRows] = useState<ValueRow[]>([{ label: "", value: "" }])
  const [pending, setPending] = useState(false)

  function reset() {
    setName("")
    setDisplayType("select")
    setRows([{ label: "", value: "" }])
  }

  async function submit() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error("Indiquez le nom de l’option (ex. Taille).")
      return
    }
    const values = rows
      .map((r) => ({
        label: r.label.trim(),
        value: r.value.trim() || r.label.trim().toLowerCase().replace(/\s+/g, "-"),
        sort_order: 0,
      }))
      .filter((r) => r.label.length > 0)
    if (values.length === 0) {
      toast.error("Ajoutez au moins une valeur (ex. S, M, L).")
      return
    }

    setPending(true)
    try {
      await apiFetch("/api/attributes", {
        method: "POST",
        body: JSON.stringify({
          store_id: storeId,
          name: trimmedName,
          display_type: displayType,
          is_required: false,
          sort_order: 0,
          values,
        }),
        redirectOnUnauthorized: true,
      })
      toast.success("Option créée")
      reset()
      onOpenChange(false)
      onCreated()
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message)
      else toast.error("Impossible de créer l’option.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle option</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-stripe-body">
          Exemple : option « Taille » avec les valeurs S, M, L — ou « Couleur » avec Bleu, Rouge.
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="attr-name">Nom de l’option</Label>
            <Input
              id="attr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Taille"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Affichage</Label>
            <Select
              value={displayType}
              onValueChange={(v) => setDisplayType(v as AttributeDisplayType)}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select">Liste</SelectItem>
                <SelectItem value="color_swatch">Couleur</SelectItem>
                <SelectItem value="button">Boutons</SelectItem>
                <SelectItem value="text">Texte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valeurs</Label>
            <ul className="mt-2 space-y-2">
              {rows.map((row, i) => (
                <li key={i} className="flex gap-2">
                  <Input
                    placeholder="Libellé (ex. M)"
                    value={row.label}
                    onChange={(e) => {
                      const next = [...rows]
                      next[i] = { ...next[i]!, label: e.target.value }
                      setRows(next)
                    }}
                  />
                  <Input
                    placeholder="Code (optionnel)"
                    value={row.value}
                    onChange={(e) => {
                      const next = [...rows]
                      next[i] = { ...next[i]!, value: e.target.value }
                      setRows(next)
                    }}
                    className="max-w-[140px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={rows.length <= 1}
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    aria-label="Retirer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setRows([...rows, { label: "", value: "" }])}
            >
              <Plus className="me-1 h-4 w-4" />
              Ajouter une valeur
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-stripe-purple text-white hover:bg-stripe-purple-hover"
            disabled={pending}
            onClick={() => void submit()}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface AddAttributeValueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  definitionId: string
  definitionName: string
  onAdded: () => void
}

export function AddAttributeValueDialog({
  open,
  onOpenChange,
  definitionId,
  definitionName,
  onAdded,
}: AddAttributeValueDialogProps) {
  const [label, setLabel] = useState("")
  const [value, setValue] = useState("")
  const [pending, setPending] = useState(false)

  async function submit() {
    const lb = label.trim()
    if (!lb) {
      toast.error("Indiquez un libellé.")
      return
    }
    const val = value.trim() || lb.toLowerCase().replace(/\s+/g, "-")
    setPending(true)
    try {
      await apiFetch(`/api/attributes/${definitionId}/values`, {
        method: "POST",
        body: JSON.stringify({ label: lb, value: val, sort_order: 0 }),
        redirectOnUnauthorized: true,
      })
      toast.success("Valeur ajoutée")
      setLabel("")
      setValue("")
      onOpenChange(false)
      onAdded()
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message)
      else toast.error("Impossible d’ajouter la valeur.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouvelle valeur — {definitionName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="val-label">Libellé</Label>
            <Input
              id="val-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="XL"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="val-code">Code (optionnel)</Label>
            <Input
              id="val-code"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-stripe-purple text-white hover:bg-stripe-purple-hover"
            disabled={pending}
            onClick={() => void submit()}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
