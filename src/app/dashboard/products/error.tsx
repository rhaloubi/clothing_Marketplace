"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ProductsError({
  reset,
}: {
  reset: () => void
}) {
  return (
    <div className="p-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Impossible de charger les produits.</p>
            <p className="text-sm text-muted-foreground">
              Réessayez dans quelques instants.
            </p>
          </div>
          <Button type="button" variant="outline" className="rounded-lg" onClick={reset}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

