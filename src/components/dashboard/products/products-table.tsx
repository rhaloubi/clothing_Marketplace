"use client"

import Link from "next/link"
import { Edit, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime, formatPrice } from "@/lib/utils"

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
        <TableRow>
          <TableHead>Produit</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Prix</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Créé le</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{product.name}</span>
                <span className="text-xs text-muted-foreground">/{product.slug}</span>
              </div>
            </TableCell>
            <TableCell>{product.category ?? "—"}</TableCell>
            <TableCell>{formatPrice(product.base_price)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    product.is_active
                      ? "rounded-full bg-green-100 text-green-800"
                      : "rounded-full bg-zinc-100 text-zinc-700"
                  }
                >
                  {product.is_active ? "Actif" : "Inactif"}
                </Badge>
                {product.is_featured ? (
                  <Badge variant="outline" className="rounded-full bg-blue-100 text-blue-800">
                    Mis en avant
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDateTime(product.created_at)}
            </TableCell>
            <TableCell className="text-right">
              <div className="inline-flex items-center gap-2">
                <Link
                  href={`/dashboard/products/${product.id}/edit?store=${storeId}`}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Edit className="me-2 h-4 w-4" />
                  Modifier
                </Link>
                <Link
                  href={`/products/${product.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

