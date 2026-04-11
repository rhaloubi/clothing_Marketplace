"use client"

import { useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import { LogOut, User, LayoutDashboard, Package2, Plus } from "lucide-react"

interface UserMenuProps {
  email: string
  fullName?: string | null
}

export function UserMenu({ email, fullName }: UserMenuProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const store = searchParams.get("store")

  const initials =
    fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? email.slice(0, 2).toUpperCase()

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (e) {
      if (e instanceof ApiClientError) {
        toast.error("Erreur lors de la déconnexion.")
      }
    }
  }, [router])

  const withStore = useCallback((path: string): string => {
    if (!store || path === "/dashboard/profile") return path
    const qs = new URLSearchParams({ store })
    return `${path}?${qs.toString()}`
  }, [store])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.shiftKey && event.metaKey)) return
      switch (event.key.toLowerCase()) {
        case "p":
          void router.push("/dashboard/profile")
          break
        case "d":
          void router.push(withStore("/dashboard"))
          break
        case "g":
          void router.push(withStore("/dashboard/products"))
          break
        case "h":
          void router.push(withStore("/dashboard/products"))
          break
        case "z":
          void logout()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [logout, router, withStore])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-500/25"
        aria-label="Menu utilisateur"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              {fullName && <span className="font-medium text-sm">{fullName}</span>}
              <span className="text-xs text-muted-foreground truncate">{email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onSelect={() => router.push("/dashboard/profile")}
          >
            <User className="h-4 w-4" />
            <span>Profil</span>
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onSelect={() => router.push(withStore("/dashboard"))}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
            <DropdownMenuShortcut>⇧⌘D</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onSelect={() => router.push(withStore("/dashboard/products"))}
          >
            <Package2 className="h-4 w-4" />
            <span>Produits</span>
            <DropdownMenuShortcut>⇧⌘G</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onSelect={() => router.push(withStore("/dashboard/products"))}
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter produit</span>
            <DropdownMenuShortcut>⇧⌘H</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
          onSelect={logout}
        >
          <LogOut className="h-4 w-4" />
          <span>Se déconnecter</span>
          <DropdownMenuShortcut>⇧⌘Z</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
