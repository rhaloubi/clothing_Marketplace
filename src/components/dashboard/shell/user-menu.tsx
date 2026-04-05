"use client"

import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import { LogOut, User } from "lucide-react"

interface UserMenuProps {
  email: string
  fullName?: string | null
}

export function UserMenu({ email, fullName }: UserMenuProps) {
  const router = useRouter()

  const initials =
    fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? email.slice(0, 2).toUpperCase()

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (e) {
      if (e instanceof ApiClientError) {
        toast.error("Erreur lors de la déconnexion.")
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Menu utilisateur"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {fullName && <span className="font-medium text-sm">{fullName}</span>}
            <span className="text-xs text-muted-foreground truncate">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onSelect={() => router.push("/dashboard/profile")}
        >
          <User className="h-4 w-4" />
          Profil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
          onSelect={logout}
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
