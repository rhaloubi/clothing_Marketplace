"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DashboardHomeRefreshButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className={cn(
        "h-11 min-h-11 gap-2 rounded-md border-stripe-border bg-white text-stripe-heading shadow-sm",
        className
      )}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw
        className={cn("h-4 w-4 shrink-0", pending && "animate-spin")}
        aria-hidden
      />
      Actualiser
    </Button>
  )
}
