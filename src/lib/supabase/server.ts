import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database.types"

/**
 * Server-side Supabase client.
 * Use in: Server Components, API Route handlers, Server Actions.
 *
 * Reads the auth session from cookies automatically.
 * RLS policies are enforced — the logged-in merchant only sees their own data.
 *
 * Usage:
 *   const supabase = createClient()
 *   const { data, error } = await supabase.from("stores").select("*")
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can throw in Server Components (read-only context).
            // Safe to ignore — middleware handles session refresh.
          }
        },
      },
    }
  )
}