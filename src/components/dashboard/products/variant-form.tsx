"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { z } from "zod"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn, formatPrice } from "@/lib/utils"
import { productVariantSchema, updateProductVariantSchema } from "@/lib/validations"
import {
  AddAttributeValueDialog,
  NewAttributeOptionDialog,
} from "@/components/dashboard/products/inline-attribute-dialogs"

export interface VariantFormAttributeDef {
  id: string
  name: string
  values: Array<{ id: string; label: string; value: string; color_hex: string | null }>
}

const variantFormClientSchema = z.object({
  sku: z
    .string()
    .max(100)
    .optional()
    .transform((s) => (typeof s === "string" && s.trim() ? s.trim() : null)),
  stock_quantity: z.coerce.number().int().min(0, "Le stock ne peut pas être négatif"),
  price_override: z
    .string()
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim()
      if (!t) return null
      const n = Number.parseInt(t, 10)
      if (Number.isNaN(n) || n < 1) return null
      return n
    }),
  is_active: z.boolean(),
  images: z.array(z.string().url()).max(5).default([]),
})

type VariantFormInput = z.input<typeof variantFormClientSchema>
type VariantFormOutput = z.output<typeof variantFormClientSchema>

interface VariantFormProps {
  mode: "create" | "edit"
  productId: string
  storeId: string
  basePriceMad: number
  productName: string
  storeAttributes: VariantFormAttributeDef[]
  variantId?: string
  initial?: {
    sku: string | null
    stock_quantity: number
    price_override: number | null
    is_active: boolean
    attribute_value_ids: string[]
  }
}

function buildPicksFromIds(
  defs: VariantFormAttributeDef[],
  ids: string[]
): Record<string, string> {
  const set = new Set(ids)
  const picks: Record<string, string> = {}
  for (const def of defs) {
    const hit = def.values.find((v) => set.has(v.id))
    if (hit) picks[def.id] = hit.id
  }
  return picks
}

export function VariantForm({
  mode,
  productId,
  storeId,
  basePriceMad,
  productName,
  storeAttributes,
  variantId,
  initial,
}: VariantFormProps) {
  const router = useRouter()
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    initial?.attribute_value_ids?.length
      ? buildPicksFromIds(storeAttributes, initial.attribute_value_ids)
      : {}
  )
  const [attrError, setAttrError] = useState<string | null>(null)
  const [newOptionOpen, setNewOptionOpen] = useState(false)
  const [addValueForDef, setAddValueForDef] = useState<VariantFormAttributeDef | null>(null)
  const [deletingDefId, setDeletingDefId] = useState<string | null>(null)

  const defaultValues = useMemo<VariantFormInput>(
    () => ({
      sku: initial?.sku ?? "",
      stock_quantity: initial?.stock_quantity ?? 0,
      price_override:
        initial?.price_override != null && initial.price_override !== undefined
          ? String(initial.price_override)
          : "",
      is_active: initial?.is_active ?? true,
      images: [],
    }),
    [initial]
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VariantFormInput, undefined, VariantFormOutput>({
    resolver: zodResolver(variantFormClientSchema),
    defaultValues,
  })

  const priceOverrideWatch = watch("price_override")

  const effectivePriceMad = useMemo(() => {
    const o = priceOverrideWatch
    if (typeof o === "number" && !Number.isNaN(o) && o >= 1) return o
    return basePriceMad
  }, [priceOverrideWatch, basePriceMad])

  function refreshAttributes() {
    router.refresh()
  }

  async function removeStoreOption(def: VariantFormAttributeDef) {
    if (
      !confirm(
        `Supprimer l’option « ${def.name} » pour cette boutique ? Les déclinaisons qui l’utilisent ne pourront plus être modifiées correctement tant qu’elles référencent cette option.`
      )
    ) {
      return
    }
    setDeletingDefId(def.id)
    try {
      await apiFetch<void>(`/api/attributes/${def.id}`, {
        method: "DELETE",
        redirectOnUnauthorized: true,
      })
      toast.success("Option supprimée")
      setPicks((prev) => {
        const next = { ...prev }
        delete next[def.id]
        return next
      })
      refreshAttributes()
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message)
      else toast.error("Impossible de supprimer l’option.")
    } finally {
      setDeletingDefId(null)
    }
  }

  async function onSubmit(values: VariantFormOutput) {
    setAttrError(null)
    const attribute_value_ids = Object.values(picks).filter(Boolean)
    if (attribute_value_ids.length < 1) {
      setAttrError("Choisissez au moins une valeur d’option pour cette déclinaison.")
      return
    }

    const body = {
      sku: values.sku?.trim() ? values.sku.trim() : null,
      stock_quantity: values.stock_quantity,
      price_override:
        values.price_override === null || values.price_override === undefined
          ? null
          : values.price_override,
      images: values.images ?? [],
      is_active: values.is_active,
      attribute_value_ids,
    }

    const parsedCreate = productVariantSchema.safeParse(body)
    if (mode === "create" && !parsedCreate.success) {
      toast.error(parsedCreate.error.errors[0]?.message ?? "Invalide")
      return
    }

    try {
      if (mode === "create") {
        await apiFetch(`/api/products/${productId}/variants`, {
          method: "POST",
          body: JSON.stringify(parsedCreate.data),
          redirectOnUnauthorized: true,
        })
        toast.success("Déclinaison créée")
      } else if (variantId) {
        const parsedPatch = updateProductVariantSchema.safeParse(body)
        if (!parsedPatch.success) {
          toast.error(parsedPatch.error.errors[0]?.message ?? "Invalide")
          return
        }
        await apiFetch(`/api/products/${productId}/variants/${variantId}`, {
          method: "PATCH",
          body: JSON.stringify(parsedPatch.data),
          redirectOnUnauthorized: true,
        })
        toast.success("Déclinaison mise à jour")
      }
      router.push(`/dashboard/products/${productId}/variants?store=${storeId}`)
      router.refresh()
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message)
      else toast.error("Impossible d’enregistrer.")
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 rounded-md border border-stripe-border bg-white p-5 shadow-stripe-card lg:p-6"
      >
        <div>
          <h2 className="text-base font-medium text-stripe-heading">
            {mode === "create" ? "Nouvelle déclinaison" : "Modifier la déclinaison"}
          </h2>
          <p className="mt-1 text-sm text-stripe-body">Produit : {productName}</p>
        </div>

        <div className="space-y-4 rounded-md border border-stripe-border bg-stripe-canvas/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-stripe-heading">Options (taille, couleur…)</p>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 px-4 text-sm font-medium text-stripe-purple"
              onClick={() => setNewOptionOpen(true)}
            >
              <Plus className="me-1 h-4 w-4" />
              Nouvelle option
            </Button>
          </div>
          {storeAttributes.length === 0 ? (
            <p className="text-sm text-stripe-body">
              Aucune option pour cette boutique. Créez-en une avec le bouton ci-dessus (ex. Taille :
              S, M, L).
            </p>
          ) : (
            <ul className="space-y-4">
              {storeAttributes.map((def) => (
                <li key={def.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor={`def-${def.id}`} className="mb-0">
                      {def.name}
                    </Label>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 min-h-9 text-xs text-stripe-purple"
                        onClick={() => setAddValueForDef(def)}
                      >
                        + Valeur
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 min-h-9 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={deletingDefId === def.id}
                        onClick={() => void removeStoreOption(def)}
                      >
                        {deletingDefId === def.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            <span className="sr-only">Suppression…</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="me-1 h-3.5 w-3.5 shrink-0" aria-hidden />
                            Supprimer l’option
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <select
                    id={`def-${def.id}`}
                    className="flex h-11 w-full rounded-md border border-stripe-border bg-white px-3 text-sm text-stripe-heading shadow-sm focus-visible:border-stripe-purple focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
                    value={picks[def.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value
                      setPicks((prev) => {
                        const next = { ...prev }
                        if (!v) delete next[def.id]
                        else next[def.id] = v
                        return next
                      })
                    }}
                  >
                    <option value="">— Choisir —</option>
                    {def.values.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
          {attrError && <p className="text-sm text-red-600">{attrError}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sku">Référence (SKU)</Label>
            <Input id="sku" {...register("sku")} className="mt-1.5 h-11" placeholder="Optionnel" />
            {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
          </div>
          <div>
            <Label htmlFor="stock_quantity">Stock</Label>
            <Input
              id="stock_quantity"
              type="number"
              min={0}
              {...register("stock_quantity", { valueAsNumber: true })}
              className="mt-1.5 h-11"
            />
            {errors.stock_quantity && (
              <p className="mt-1 text-xs text-red-600">{errors.stock_quantity.message}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="price_override">Prix (MAD) — laisser vide pour le prix du produit</Label>
            <Input
              id="price_override"
              type="number"
              min={1}
              placeholder={`${basePriceMad} (prix produit)`}
              {...register("price_override")}
              className="mt-1.5 h-11"
            />
            {errors.price_override && (
              <p className="mt-1 text-xs text-red-600">{errors.price_override.message}</p>
            )}
            <p className="mt-1 text-xs text-stripe-body">
              Prix affiché pour cette déclinaison : {formatPrice(effectivePriceMad)}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-stripe-heading">
          <input type="checkbox" {...register("is_active")} className="size-4 rounded border-stripe-border" />
          Déclinaison active à la vente
        </label>
        {errors.is_active && (
          <p className="text-xs text-red-600">{errors.is_active.message}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 min-h-11 px-5 text-sm font-medium bg-stripe-purple text-white hover:bg-stripe-purple-hover"
          >
            {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Créer" : "Enregistrer"}
          </Button>
          <Link
            href={`/dashboard/products/${productId}/variants?store=${storeId}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "inline-flex h-11 min-h-11 items-center justify-center px-5 text-sm font-medium"
            )}
          >
            Annuler
          </Link>
        </div>
      </form>

      <NewAttributeOptionDialog
        open={newOptionOpen}
        onOpenChange={setNewOptionOpen}
        storeId={storeId}
        onCreated={refreshAttributes}
      />
      {addValueForDef ? (
        <AddAttributeValueDialog
          open
          onOpenChange={(o) => {
            if (!o) setAddValueForDef(null)
          }}
          definitionId={addValueForDef.id}
          definitionName={addValueForDef.name}
          onAdded={() => {
            setAddValueForDef(null)
            refreshAttributes()
          }}
        />
      ) : null}
    </>
  )
}
