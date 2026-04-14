"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buttonVariants } from "@/components/ui/button"
import { ChevronsUpDown, Store, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface StoreOption {
  id: string
  name: string
  slug: string
}

interface StoreSwitcherProps {
  stores: StoreOption[]
  className?: string
}

export function StoreSwitcher({ stores, className }: StoreSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeId = searchParams.get("store")
  const activeStore = stores.find((s) => s.id === activeId) ?? stores[0]

  function switchStore(id: string) {
    const next = new URLSearchParams(searchParams.toString())
    next.set("store", id)
    router.push(`${pathname}?${next.toString()}`)
  }

  if (stores.length === 0) {
    return (
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "w-full justify-start gap-2 text-muted-foreground",
          className
        )}
        onClick={() => router.push("/dashboard/stores/new")}
      >
        <PlusCircle className="h-4 w-4" />
        Créer une boutique
      </button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "w-full justify-between gap-2 font-normal",
          className
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{activeStore?.name ?? "Sélectionner"}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Mes boutiques
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {stores.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onClick={() => switchStore(s.id)}
            className={cn(
              "cursor-pointer gap-2",
              s.id === activeId && "font-medium"
            )}
          >
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{s.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-muted-foreground"
          onClick={() => router.push("/dashboard/stores/new")}
        >
          <PlusCircle className="h-4 w-4" />
          Nouvelle boutique
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
