"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import {
  dashboardTableBodyRowClass,
  dashboardTableHeadClass,
  dashboardTableHeaderRowClass,
} from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import {
  shippingZoneFormSchema,
  type ShippingZoneFormInput,
} from "@/lib/validations"
import { formatPrice } from "@/lib/utils"
import type { ShippingZoneWithWilaya, Wilaya } from "@/types"
import { toast } from "sonner"

type ZoneFormValues = ShippingZoneFormInput

function formatDelayLabel(min: number, max: number): string {
  if (min === max) return `${min} jour${min > 1 ? "s" : ""}`
  return `${min} – ${max} jours`
}

type ZoneRow = ShippingZoneWithWilaya

export function ShippingZonesSettings({
  storeId,
  zones,
  wilayas,
}: {
  storeId: string
  zones: ZoneRow[]
  wilayas: Wilaya[]
}) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ZoneRow | null>(null)

  const availableWilayas = useMemo(() => {
    const used = new Set(zones.map((z) => z.wilaya_id))
    if (editing) used.delete(editing.wilaya_id)
    return wilayas.filter((w) => !used.has(w.id))
  }, [zones, wilayas, editing])

  const openCreate = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  const openEdit = (z: ZoneRow) => {
    setEditing(z)
    setSheetOpen(true)
  }

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    setEditing(null)
  }, [])

  return (
    <div className="space-y-4">
      <div className="space-y-2 md:hidden">
        {zones.length === 0 ? (
          <div className="rounded-md border border-stripe-border bg-stripe-canvas/40 px-3 py-6 text-center text-sm text-stripe-body">
            Aucune zone. Ajoutez au moins une wilaya pour la livraison au checkout.
          </div>
        ) : (
          zones.map((z) => (
            <article
              key={z.id}
              className="rounded-md border border-stripe-border bg-white px-3 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-stripe-heading">{z.wilaya.name_fr}</p>
                  <p className="text-xs text-stripe-body">
                    Délai: {formatDelayLabel(z.estimated_days_min, z.estimated_days_max)}
                  </p>
                  <p className="text-xs font-medium tabular-nums-stripe text-stripe-heading">
                    {formatPrice(z.price_mad)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-10 w-10 text-stripe-label"
                    aria-label={`Modifier ${z.wilaya.name_fr}`}
                    onClick={() => openEdit(z)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-10 w-10 text-red-600 hover:text-red-700"
                    aria-label={`Supprimer ${z.wilaya.name_fr}`}
                    onClick={async () => {
                      if (!window.confirm(`Supprimer la zone « ${z.wilaya.name_fr} » ?`)) return
                      try {
                        await apiFetch(`/api/stores/${storeId}/shipping-zones/${z.id}`, {
                          method: "DELETE",
                          redirectOnUnauthorized: true,
                        })
                        toast.success("Zone supprimée.")
                        router.refresh()
                      } catch (e) {
                        toast.error(
                          e instanceof ApiClientError ? e.message : "Suppression impossible."
                        )
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className={dashboardTableHeaderRowClass}>
              <TableHead className={dashboardTableHeadClass}>Wilaya</TableHead>
              <TableHead className={dashboardTableHeadClass}>
                Délai estimé
              </TableHead>
              <TableHead className={dashboardTableHeadClass}>Tarif (MAD)</TableHead>
              <TableHead className={dashboardTableHeadClass} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.length === 0 ? (
              <TableRow className={dashboardTableBodyRowClass}>
                <TableCell
                  colSpan={4}
                  className="px-3 py-8 text-center text-sm text-stripe-body"
                >
                  Aucune zone. Ajoutez au moins une wilaya pour la livraison au
                  checkout.
                </TableCell>
              </TableRow>
            ) : (
              zones.map((z) => (
                <TableRow key={z.id} className={dashboardTableBodyRowClass}>
                  <TableCell className="px-3 py-3 font-medium text-stripe-heading">
                    {z.wilaya.name_fr}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-sm text-stripe-body">
                    {formatDelayLabel(z.estimated_days_min, z.estimated_days_max)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-sm font-medium tabular-nums-stripe text-stripe-heading">
                    {formatPrice(z.price_mad)}
                  </TableCell>
                  <TableCell className="px-2 py-3 text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-11 w-11 text-stripe-label"
                        aria-label={`Modifier ${z.wilaya.name_fr}`}
                        onClick={() => openEdit(z)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-11 w-11 text-red-600 hover:text-red-700"
                        aria-label={`Supprimer ${z.wilaya.name_fr}`}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Supprimer la zone « ${z.wilaya.name_fr} » ?`
                            )
                          ) {
                            return
                          }
                          try {
                            await apiFetch(
                              `/api/stores/${storeId}/shipping-zones/${z.id}`,
                              { method: "DELETE", redirectOnUnauthorized: true }
                            )
                            toast.success("Zone supprimée.")
                            router.refresh()
                          } catch (e) {
                            toast.error(
                              e instanceof ApiClientError
                                ? e.message
                                : "Suppression impossible."
                            )
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="h-11 min-h-11 gap-2 px-0 text-sm font-medium uppercase tracking-wide text-stripe-purple hover:bg-transparent hover:text-stripe-purple-hover"
        onClick={openCreate}
        disabled={availableWilayas.length === 0}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter une zone
      </Button>

      <ZoneSheet
        open={sheetOpen}
        onClose={closeSheet}
        storeId={storeId}
        editing={editing}
        wilayaSelectList={editing ? [editing.wilaya] : availableWilayas}
        onSaved={() => {
          closeSheet()
          router.refresh()
        }}
      />
    </div>
  )
}

function ZoneSheet({
  open,
  onClose,
  storeId,
  editing,
  wilayaSelectList,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  storeId: string
  editing: ZoneRow | null
  wilayaSelectList: Wilaya[]
  onSaved: () => void
}) {
  const defaults = useMemo<ZoneFormValues>(
    () =>
      editing
        ? {
            wilaya_id: editing.wilaya_id,
            price_mad: editing.price_mad,
            estimated_days_min: editing.estimated_days_min,
            estimated_days_max: editing.estimated_days_max,
          }
        : {
            wilaya_id: wilayaSelectList[0]?.id ?? 1,
            price_mad: 25,
            estimated_days_min: 2,
            estimated_days_max: 5,
          },
    [editing, wilayaSelectList]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ZoneFormValues>({
    resolver: zodResolver(shippingZoneFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) reset(defaults)
  }, [open, defaults, reset])

  const wilayaOptions = wilayaSelectList

  const onSubmit = async (data: ZoneFormValues) => {
    try {
      if (editing) {
        await apiFetch(`/api/stores/${storeId}/shipping-zones/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            price_mad: data.price_mad,
            estimated_days_min: data.estimated_days_min,
            estimated_days_max: data.estimated_days_max,
          }),
          redirectOnUnauthorized: true,
        })
        toast.success("Zone mise à jour.")
      } else {
        await apiFetch(`/api/stores/${storeId}/shipping-zones`, {
          method: "POST",
          body: JSON.stringify({
            wilaya_id: data.wilaya_id,
            price_mad: data.price_mad,
            estimated_days_min: data.estimated_days_min,
            estimated_days_max: data.estimated_days_max,
            is_active: true,
          }),
          redirectOnUnauthorized: true,
        })
        toast.success("Zone ajoutée.")
      }
      reset()
      onSaved()
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "Enregistrement impossible."
      )
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent side="right" className="w-full max-w-md sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {editing ? "Modifier la zone" : "Nouvelle zone de livraison"}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
              Wilaya
            </Label>
            <select
              {...register("wilaya_id")}
              disabled={Boolean(editing)}
              className="flex h-11 w-full rounded-[4px] border border-stripe-border bg-white px-3 text-sm text-stripe-heading shadow-sm disabled:bg-stripe-canvas"
            >
              {wilayaOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name_fr}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
                Délai min (jours)
              </Label>
              <Input
                type="number"
                min={1}
                {...register("estimated_days_min")}
                className="min-h-11 rounded-[4px]"
              />
              {errors.estimated_days_min ? (
                <p className="text-xs text-red-600">
                  {errors.estimated_days_min.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
                Délai max (jours)
              </Label>
              <Input
                type="number"
                min={1}
                {...register("estimated_days_max")}
                className="min-h-11 rounded-[4px]"
              />
              {errors.estimated_days_max ? (
                <p className="text-xs text-red-600">
                  {errors.estimated_days_max.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
              Tarif (MAD, entier)
            </Label>
            <Input
              type="number"
              min={0}
              step={1}
              {...register("price_mad")}
              className="min-h-11 rounded-[4px]"
            />
            {errors.price_mad ? (
              <p className="text-xs text-red-600">{errors.price_mad.message}</p>
            ) : null}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || wilayaOptions.length === 0}
              className="min-h-11 bg-stripe-purple hover:bg-stripe-purple-hover"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : editing ? (
                "Enregistrer"
              ) : (
                "Ajouter"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
