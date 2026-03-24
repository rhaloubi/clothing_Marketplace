"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

/**
 * Browser-side Supabase client.
 * Use in: Client Components ("use client") only.
 *
 * For data fetching in client components, prefer TanStack Query + a Server Action
 * over calling Supabase directly. Use this client for:
 *   - Auth state listeners (onAuthStateChange)
 *   - Realtime subscriptions (order dashboard live updates)
 *
 * Usage:
 *   const supabase = createClient()
 *   supabase.auth.onAuthStateChange((event, session) => { ... })
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}