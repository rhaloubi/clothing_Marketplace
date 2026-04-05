import { QueryProvider } from "@/components/shared/query-provider"
import type { ReactNode } from "react"

/**
 * Merchant dashboard shell.
 * Auth is enforced in middleware (`/dashboard` → redirect `/login` if no session).
 * TanStack Query is scoped here so the storefront stays free of the provider.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>
}
