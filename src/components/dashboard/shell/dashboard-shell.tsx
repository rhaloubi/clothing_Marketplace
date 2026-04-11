"use client"

import { useState, Suspense, useEffect, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { NavLinks } from "./nav-links"
import { DashboardTopbar } from "./dashboard-topbar"

const SIDEBAR_COLLAPSED_KEY = "shri_dashboard_sidebar_collapsed"

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setSidebarCollapsed(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const sidebarContentMobile = (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="flex-1 overflow-y-auto">
        <Suspense>
          <NavLinks collapsed={false} onNavigate={() => setSidebarOpen(false)} />
        </Suspense>
      </div>
    </div>
  )

  const sidebarContentDesktop = (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <Suspense>
          <NavLinks collapsed={sidebarCollapsed} />
        </Suspense>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-stripe-canvas">
      {/* Desktop sidebar — collapsible icon rail */}
      <aside
        className={cn(
          "hidden shrink-0 border-e border-stripe-border bg-white transition-[width] duration-200 ease-out lg:flex lg:flex-col",
          sidebarCollapsed ? "w-[4.25rem]" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-stripe-border px-3",
            sidebarCollapsed ? "justify-center" : "justify-start"
          )}
        >
          {!sidebarCollapsed ? (
            <span className="truncate text-[15px] font-semibold tracking-tight text-stripe-heading">
              Shri
            </span>
          ) : (
            <>
              <span className="text-sm font-bold text-stripe-purple" aria-hidden>
                S
              </span>
              <span className="sr-only">Shri</span>
            </>
          )}
        </div>
        {sidebarContentDesktop}
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 border-e border-stripe-border bg-white p-0">
          <SheetHeader className="flex h-14 items-center justify-start border-b border-stripe-border px-4 py-0">
            <SheetTitle className="text-[15px] font-semibold tracking-tight text-stripe-heading">
              Shri
            </SheetTitle>
          </SheetHeader>
          {sidebarContentMobile}
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar
          userEmail={userEmail}
          userFullName={userFullName}
          onOpenSidebar={() => setSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapsed={toggleSidebarCollapsed}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-stripe-canvas px-4 py-5 lg:px-6 lg:py-6">
          {children}
        </main>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  )
}
