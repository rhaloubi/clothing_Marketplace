"use client"

import { Bell, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserMenu } from "./user-menu"
import { SearchCommand } from "./search-command"
import { HeaderToggleHint } from "./header-toggle-hint"

interface DashboardTopbarProps {
  userEmail: string
  userFullName?: string | null
  onOpenSidebar: () => void
  sidebarCollapsed: boolean
  onToggleSidebarCollapsed: () => void
}

export function DashboardTopbar({
  userEmail,
  userFullName,
  onOpenSidebar,
  sidebarCollapsed,
  onToggleSidebarCollapsed,
}: DashboardTopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-zinc-200 bg-white px-3 lg:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <HeaderToggleHint
          className="relative shrink-0 lg:hidden"
          onClick={onOpenSidebar}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden size-11 min-h-11 min-w-11 shrink-0 rounded-md text-zinc-600 hover:bg-zinc-100 lg:inline-flex"
          onClick={onToggleSidebarCollapsed}
          aria-expanded={!sidebarCollapsed}
          aria-label={
            sidebarCollapsed
              ? "Agrandir le menu latéral"
              : "Réduire le menu latéral"
          }
          title={
            sidebarCollapsed
              ? "Agrandir le menu latéral"
              : "Réduire le menu latéral"
          }
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronsLeft className="h-4 w-4" aria-hidden />
          )}
        </Button>

        <div className="min-w-0 flex-1 max-w-lg">
          <SearchCommand />
        </div>
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-md text-zinc-600 hover:bg-zinc-100"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-violet-500" />
        </Button>

        <UserMenu email={userEmail} fullName={userFullName} />
      </div>
    </header>
  )
}

