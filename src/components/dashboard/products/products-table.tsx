"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Edit, ExternalLink, Layers, MoreVertical, Package } from "lucide-react"
import {
  dashboardTableBodyRowClass,
  dashboardTableHeadClass,
  dashboardTableHeaderRowClass,
} from "@/components/dashboard/dashboard-page"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  PRODUCT_LIST_LOW_STOCK_THRESHOLD,
  cn,
  formatPrice,
} from "@/lib/utils"
import type { ProductDashboardListRow } from "@/types"

interface ProductsTableProps {
  products: ProductDashboardListRow[]
  storeId: string
  maxStockOnPage: number
}

function stockBarValue(total: number, maxOnPage: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((total / maxOnPage) * 100))
}

function isLowStock(total: number): boolean {
  return total === 0 || (total > 0 && total < PRODUCT_LIST_LOW_STOCK_THRESHOLD)
}

export function ProductsTable({ products, storeId, maxStockOnPage }: ProductsTableProps) {
  const router = useRouter()

  return (
    <Table>
      <TableHeader>
        <TableRow className={dashboardTableHeaderRowClass}>
          <TableHead className={dashboardTableHeadClass}>Produit</TableHead>
          <TableHead className={dashboardTableHeadClass}>Prix de base</TableHead>
          <TableHead className={dashboardTableHeadClass}>Variantes</TableHead>
          <TableHead className={dashboardTableHeadClass}>Stock total</TableHead>
          <TableHead className={dashboardTableHeadClass}>Statut</TableHead>
          <TableHead className={cn(dashboardTableHeadClass, "w-12 text-end")}>
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const thumb = product.images[0] ?? null
          const low = isLowStock(product.total_stock)
          const barPct = stockBarValue(product.total_stock, maxStockOnPage)

          return (
            <TableRow key={product.id} className={dashboardTableBodyRowClass}>
              <TableCell className="px-3 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-stripe-canvas ring-1 ring-stripe-border/80">
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package
                          className="h-5 w-5 text-stripe-label"
                          aria-hidden
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stripe-heading">
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-stripe-body">
                      {product.reference_label}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-3 py-4">
                <span className="font-semibold tabular-nums-stripe text-stripe-heading">
                  {formatPrice(product.base_price)}
                </span>
              </TableCell>
              <TableCell className="px-3 py-4">
                <Badge
                  variant="outline"
                  className="rounded-full border-sky-200/80 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800"
                >
                  {product.variant_count === 1
                    ? "1 variante"
                    : `${product.variant_count} variantes`}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] px-3 py-4">
                <div className="space-y-1.5">
                  <p
                    className={cn(
                      "text-sm font-medium tabular-nums-stripe",
                      low ? "text-red-600" : "text-stripe-heading"
                    )}
                  >
                    {product.total_stock}{" "}
                    <span className="font-normal text-stripe-body">unités</span>
                  </p>
                  <div
                    className={cn(
                      "h-1.5 w-full overflow-hidden rounded-full bg-stripe-border/60",
                      low && "bg-red-100"
                    )}
                    role="progressbar"
                    aria-valuenow={product.total_stock}
                    aria-valuemin={0}
                    aria-valuemax={maxStockOnPage}
                    aria-label={`Stock ${product.total_stock} unités`}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full bg-stripe-purple transition-[width] duration-300",
                        low && "bg-red-500"
                      )}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-3 py-4">
                {product.is_active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(21,190,83,0.35)] bg-[rgba(21,190,83,0.12)] px-2.5 py-1 text-xs font-medium text-stripe-success-text">
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-stripe-success"
                      aria-hidden
                    />
                    Actif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-stripe-border bg-stripe-canvas px-2.5 py-1 text-xs font-medium text-stripe-label">
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-stripe-label/50"
                      aria-hidden
                    />
                    Brouillon
                  </span>
                )}
              </TableCell>
              <TableCell className="px-2 py-4 text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      "inline-flex h-11 w-11 items-center justify-center rounded-md text-stripe-label outline-none transition-colors hover:bg-stripe-canvas hover:text-stripe-heading focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
                    )}
                    aria-label={`Actions pour ${product.name}`}
                  >
                    <MoreVertical className="h-5 w-5" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    <DropdownMenuItem
                      className="cursor-pointer gap-2"
                      onClick={() => {
                        router.push(
                          `/dashboard/products/${product.id}/variants?store=${storeId}`
                        )
                      }}
                    >
                      <Layers className="h-4 w-4" aria-hidden />
                      Déclinaisons
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2"
                      onClick={() => {
                        router.push(
                          `/dashboard/products/${product.id}/edit?store=${storeId}`
                        )
                      }}
                    >
                      <Edit className="h-4 w-4" aria-hidden />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2"
                      onClick={() => {
                        window.open(
                          `/products/${product.slug}`,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }}
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Voir la fiche
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
