"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart2,
  Settings,
  User,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Aperçu", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/orders", label: "Commandes", icon: ShoppingBag },
  { href: "/dashboard/products", label: "Produits", icon: Package },
  { href: "/dashboard/analytics", label: "Statistiques", icon: BarChart2 },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
  { href: "/dashboard/profile", label: "Profil", icon: User, noStore: true },
]

interface NavLinksProps {
  onNavigate?: () => void
  /** Desktop only: hide labels and show icons centered (narrow rail). */
  collapsed?: boolean
}

export function NavLinks({ onNavigate, collapsed = false }: NavLinksProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const storeId = searchParams.get("store")

  function buildHref(base: string, noStore?: boolean) {
    if (noStore || !storeId) return base
    const qs = new URLSearchParams({ store: storeId })
    return `${base}?${qs.toString()}`
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav
      className={cn(
        "flex flex-col gap-0.5 py-3",
        collapsed ? "items-center px-1.5" : "px-2"
      )}
    >
      {navItems.map(({ href, label, icon: Icon, exact, noStore }) => (
        <Link
          key={href}
          href={buildHref(href, noStore)}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={cn(
            "flex items-center rounded-md text-sm font-medium transition-colors duration-150",
            collapsed
              ? "size-11 shrink-0 justify-center p-0 min-h-11 min-w-11"
              : "gap-3 px-2.5 py-2 min-h-11",
            isActive(href, exact)
              ? "bg-stripe-purple-muted/35 text-stripe-purple"
              : "text-stripe-body hover:bg-white/80"
          )}
        >
          <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span className={cn(collapsed && "sr-only")}>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
