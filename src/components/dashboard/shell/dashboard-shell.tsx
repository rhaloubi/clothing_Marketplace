"use client"

import { useState, Suspense } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { Separator } from "@/components/ui/separator"
import { Menu } from "lucide-react"
import { StoreSwitcher } from "./store-switcher"
import { NavLinks } from "./nav-links"
import { UserMenu } from "./user-menu"

interface StoreOption {
  id: string
  name: string
  slug: string
}

interface DashboardShellProps {
  children: React.ReactNode
  stores: StoreOption[]
  userEmail: string
  userFullName?: string | null
}

export function DashboardShell({
  children,
  stores,
  userEmail,
  userFullName,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sidebarContent = (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="px-2">
        <Suspense>
          <StoreSwitcher stores={stores} />
        </Suspense>
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto">
        <Suspense>
          <NavLinks onNavigate={() => setSidebarOpen(false)} />
        </Suspense>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-e border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <span className="text-base font-semibold tracking-tight">Shri</span>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetHeader className="flex h-14 items-center justify-start border-b border-sidebar-border px-4 py-0">
            <SheetTitle className="text-base font-semibold tracking-tight">
              Shri
            </SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 lg:hidden" />
          <div className="ms-auto flex items-center gap-2">
            <UserMenu email={userEmail} fullName={userFullName} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  )
}
