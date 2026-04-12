"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatPrice } from "@/lib/utils"
import type { ProductVariant } from "@/types"

export interface VariantsTableProps {
  productId: string
  storeId: string
  basePriceMad: number
  variants: ProductVariant[]
}

function optionSummary(v: ProductVariant): string {
  const attrs = v.attributes
  if (!attrs?.length) return "—"
  return attrs.map((a) => `${a.definition_name}: ${a.value_label}`).join(" · ")
}

export function VariantsTable({
  productId,
  storeId,
  basePriceMad,
  variants,
}: VariantsTableProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function removeVariant(variantId: string) {
    if (!confirm("Supprimer cette déclinaison ? Cette action est définitive.")) return
    setDeletingId(variantId)
    try {
      await apiFetch(`/api/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
        redirectOnUnauthorized: true,
      })
      toast.success("Déclinaison supprimée")
      router.refresh()
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message)
      else toast.error("Impossible de supprimer.")
    } finally {
      setDeletingId(null)
    }
  }

  if (variants.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-stripe-border bg-stripe-canvas/50 px-6 py-12 text-center">
        <p className="text-sm font-medium text-stripe-heading">Aucune déclinaison</p>
        <p className="mt-1 text-sm text-stripe-body">
          Ajoutez une déclinaison pour chaque combinaison (taille, couleur, etc.).
        </p>
        <Link
          href={`/dashboard/products/${productId}/variants/new?store=${storeId}`}
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "mt-4 inline-flex h-11 min-h-11 items-center justify-center bg-stripe-purple px-4 text-white hover:bg-stripe-purple-hover"
          )}
        >
          Ajouter une déclinaison
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-stripe-border bg-white shadow-stripe-card">
      <Table>
        <TableHeader>
          <TableRow className="border-stripe-border hover:bg-transparent">
            <TableHead className="text-stripe-label">Options</TableHead>
            <TableHead className="text-stripe-label">Réf.</TableHead>
            <TableHead className="text-end text-stripe-label">Prix</TableHead>
            <TableHead className="text-end text-stripe-label">Stock</TableHead>
            <TableHead className="text-stripe-label">État</TableHead>
            <TableHead className="w-[120px] text-stripe-label">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((v) => {
            const price = v.price_override ?? basePriceMad
            return (
              <TableRow key={v.id} className="border-stripe-border">
                <TableCell className="max-w-[240px] text-sm text-stripe-heading">
                  {optionSummary(v)}
                </TableCell>
                <TableCell className="text-sm text-stripe-body">{v.sku ?? "—"}</TableCell>
                <TableCell className="text-end text-sm font-medium tabular-nums-stripe text-stripe-heading">
                  {formatPrice(price)}
                </TableCell>
                <TableCell className="text-end text-sm tabular-nums-stripe text-stripe-heading">
                  {v.stock_quantity}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      v.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-stripe-canvas text-stripe-body"
                    )}
                  >
                    {v.is_active ? "Actif" : "Inactif"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/products/${productId}/variants/${v.id}/edit?store=${storeId}`}
                      aria-label="Modifier"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon-sm" }),
                        "inline-flex h-9 w-9"
                      )}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-9 w-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={deletingId === v.id}
                      aria-label="Supprimer"
                      onClick={() => void removeVariant(v.id)}
                    >
                      {deletingId === v.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
