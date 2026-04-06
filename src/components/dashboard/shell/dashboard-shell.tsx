"use client"

import { useState, Suspense } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { NavLinks } from "./nav-links"
import { DashboardTopbar } from "./dashboard-topbar"

interface DashboardShellProps {
  children: React.ReactNode
  userEmail: string
  userFullName?: string | null
}

export function DashboardShell({
  children,
  userEmail,
  userFullName,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sidebarContent = (
    <div className="flex h-full flex-col gap-4 py-4">
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
      <aside className="hidden w-60 shrink-0 border-r  border-gray-200 lg:flex lg:flex-col">
        <div className="flex h-16 items-center px-5">
          <span className="text-base font-semibold tracking-tight">Shri</span>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 border-r bg-zinc-100 p-0">
          <SheetHeader className="flex h-16 items-center justify-start px-5 py-0">
            <SheetTitle className="text-base font-semibold tracking-tight">
              Shri
            </SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar
          userEmail={userEmail}
          userFullName={userFullName}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
          {children}
        </main>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  )
}
