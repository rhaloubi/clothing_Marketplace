
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart2,
  Settings,
  CreditCard,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Aperçu", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/orders", label: "Commandes", icon: ShoppingBag },
  { href: "/dashboard/products", label: "Produits", icon: Package },
  { href: "/dashboard/analytics", label: "Statistiques", icon: BarChart2 },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
  { href: "/dashboard/subscription", label: "Abonnement", icon: CreditCard, noStore: true },
]

interface NavLinksProps {
  onNavigate?: () => void
}

export function NavLinks({ onNavigate }: NavLinksProps) {
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
    <nav className="flex flex-col gap-1 px-3 ">
      {navItems.map(({ href, label, icon: Icon, exact, noStore }) => (
        <Link
          key={href}
          href={buildHref(href, noStore)}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-150 ",
            isActive(href, exact)
              ? " text-secondary hover:bg-secondary/5"
              : "text-sidebar-foreground/70 hover:bg-zinc-200/50"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
