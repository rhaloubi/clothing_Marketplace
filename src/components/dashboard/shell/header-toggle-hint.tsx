"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface HeaderToggleHintProps {
  onClick: () => void
  className?: string
}

export function HeaderToggleHint({ onClick, className }: HeaderToggleHintProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={className}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-md text-zinc-600 hover:bg-zinc-100"
        onClick={onClick}
        aria-label="Ouvrir le menu latéral"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
        </svg>
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      {open ? (
        <div className="pointer-events-none absolute left-0 top-11 z-50 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 shadow-sm">
          ⌘B
        </div>
      ) : null}
    </div>
  )
}

