import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QueryProvider } from "@/components/shared/query-provider"
import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell"
import type { ReactNode } from "react"

/**
 * Dashboard layout: resolves auth + profile and renders shell.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profileResult } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()

  const fullName = profileResult?.full_name ?? null

  return (
    <QueryProvider>
      <DashboardShell userEmail={user.email ?? ""} userFullName={fullName}>
        {children}
      </DashboardShell>
    </QueryProvider>
  )
}

