import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database.types"

/**
 * Server-side Supabase client — Next.js 15 compatible.
 *
 * BREAKING CHANGE in Next.js 15: cookies() is now async.
 * This function must be called with await:
 *   const supabase = await createClient()
 *
 * Use in: Server Components, API Route handlers, Server Actions.
 * RLS policies are enforced — merchant only sees their own data.
 *
 * Usage:
 *   const supabase = await createClient()
 *   const { data } = await supabase.from("stores").select("*")
 */
export async function createClient() {
  // Next.js 15: cookies() returns a Promise — must be awaited
  const cookieStore = await cookies()

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