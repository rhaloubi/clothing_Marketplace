"use client"

import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { UserMenu } from "./user-menu"
import { SearchCommand } from "./search-command"
import { HeaderToggleHint } from "./header-toggle-hint"

interface DashboardTopbarProps {
  userEmail: string
  userFullName?: string | null
  onOpenSidebar: () => void
}

export function DashboardTopbar({
  userEmail,
  userFullName,
  onOpenSidebar,
}: DashboardTopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center  bg-background px-3 lg:px-5">
      <div className="flex flex-1 items-center gap-2">
        <HeaderToggleHint
          className="relative lg:hidden"
          onClick={onOpenSidebar}
        />

        <div className="w-full max-w-lg">
          <SearchCommand />
        </div>
      </div>

      <div className="ms-auto flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl hover:bg-zinc-200/70"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-secondary" />
        </Button>

        <UserMenu email={userEmail} fullName={userFullName} />
      </div>
    </header>
  )
}

