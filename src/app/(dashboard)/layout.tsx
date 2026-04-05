import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QueryProvider } from "@/components/shared/query-provider"
import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell"
import type { ReactNode } from "react"

/**
 * Dashboard layout: resolves auth + stores, renders the shell.
 * Middleware already redirects unauthenticated requests to /login;
 * we double-check here for belt-and-suspenders defence in depth.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [profileResult, storesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("stores")
      .select("id, name, slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ])

  const fullName = profileResult.data?.full_name ?? null
  const stores = storesResult.data ?? []

  return (
    <QueryProvider>
      <DashboardShell
        stores={stores}
        userEmail={user.email ?? ""}
        userFullName={fullName}
      >
        {children}
      </DashboardShell>
    </QueryProvider>
  )
}
