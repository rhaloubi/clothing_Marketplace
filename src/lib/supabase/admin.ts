import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

/**
 * Admin Supabase client using the SERVICE ROLE key.
 *
 * ⚠️  BYPASSES Row Level Security — use only for:
 *   - Webhook handlers (order status updates from delivery providers)
 *   - Cron jobs (subscription expiry, analytics aggregation)
 *   - Admin-only API routes (platform management)
 *   - Creating records on behalf of users (e.g. seeding after signup)
 *
 * NEVER import this in Client Components or expose to the browser.
 * The service role key must stay server-side only.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}