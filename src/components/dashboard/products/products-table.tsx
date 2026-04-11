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
                <span className="font-medium text-zinc-900">{product.name}</span>
                <span className="text-xs text-zinc-500">/{product.slug}</span>
              </div>
            </TableCell>
            <TableCell className="px-3 py-3 text-zinc-800">
              {product.category ?? "—"}
            </TableCell>
            <TableCell className="px-3 py-3 text-zinc-800">
              {formatPrice(product.base_price)}
            </TableCell>
            <TableCell className="px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    product.is_active
                      ? "rounded-full border-green-200 bg-green-50 text-green-800"
                      : "rounded-full border-zinc-200 bg-zinc-100 text-zinc-700"
                  }
                >
                  {product.is_active ? "Actif" : "Inactif"}
                </Badge>
                {product.is_featured ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-violet-200 bg-violet-50 text-violet-800"
                  >
                    Mis en avant
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell className="px-3 py-3 text-zinc-500">
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

