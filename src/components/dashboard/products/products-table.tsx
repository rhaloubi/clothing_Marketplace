"use client"

import Link from "next/link"
import { Edit, ExternalLink } from "lucide-react"
import {
  dashboardLinkOutlineSm,
  dashboardTableBodyRowClass,
  dashboardTableHeadClass,
  dashboardTableHeaderRowClass,
} from "@/components/dashboard/dashboard-page"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatDateTime, formatPrice } from "@/lib/utils"

export interface ProductTableRow {
  id: string
  name: string
  slug: string
  category: string | null
  base_price: number
  is_active: boolean
  is_featured: boolean
  created_at: string
}

interface ProductsTableProps {
  products: ProductTableRow[]
  storeId: string
}

export function ProductsTable({ products, storeId }: ProductsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className={dashboardTableHeaderRowClass}>
          <TableHead className={dashboardTableHeadClass}>Produit</TableHead>
          <TableHead className={dashboardTableHeadClass}>Catégorie</TableHead>
          <TableHead className={dashboardTableHeadClass}>Prix</TableHead>
          <TableHead className={dashboardTableHeadClass}>Statut</TableHead>
          <TableHead className={dashboardTableHeadClass}>Créé le</TableHead>
          <TableHead className={cn(dashboardTableHeadClass, "text-right")}>
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id} className={dashboardTableBodyRowClass}>
            <TableCell className="px-3 py-3">
              <div className="flex flex-col">
                <span className="font-medium text-stripe-heading">{product.name}</span>
                <span className="text-xs text-stripe-body">/{product.slug}</span>
              </div>
            </TableCell>
            <TableCell className="px-3 py-3 text-stripe-heading">
              {product.category ?? "—"}
            </TableCell>
            <TableCell className="px-3 py-3 text-stripe-heading tabular-nums-stripe">
              {formatPrice(product.base_price)}
            </TableCell>
            <TableCell className="px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    product.is_active
                      ? "rounded-[4px] border-[rgba(21,190,83,0.4)] bg-[rgba(21,190,83,0.2)] text-sm font-medium text-stripe-success-text"
                      : "rounded-[4px] border-stripe-border bg-stripe-canvas text-sm font-medium text-stripe-label"
                  }
                >
                  {product.is_active ? "Actif" : "Inactif"}
                </Badge>
                {product.is_featured ? (
                  <Badge
                    variant="outline"
                    className="rounded-[4px] border-stripe-purple-muted bg-stripe-purple-muted/30 text-sm font-medium text-stripe-purple"
                  >
                    Mis en avant
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell className="px-3 py-3 text-sm text-stripe-body">
              {formatDateTime(product.created_at)}
            </TableCell>
            <TableCell className="px-3 py-3 text-right">
              <div className="inline-flex flex-wrap items-center justify-end gap-2">
                <Link
                  href={`/dashboard/products/${product.id}/edit?store=${storeId}`}
                  className={cn(dashboardLinkOutlineSm, "gap-2")}
                >
                  <Edit className="h-4 w-4 shrink-0" aria-hidden />
                  Modifier
                </Link>
                <Link
                  href={`/products/${product.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className={dashboardLinkOutlineSm}
                  aria-label="Voir sur la boutique"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

