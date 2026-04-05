import { Toaster } from "@/components/ui/sonner"
import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  )
}
