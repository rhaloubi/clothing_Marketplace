import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fail } from "./response"
import { UnauthorizedError, NotFoundError } from "./errors"
import type { Database } from "@/types/database.types"

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export interface AuthContext {
  user: {
    id: string
    email: string
  }
  profile: Profile
}

type AuthedHandler = (
  request: NextRequest,
  context: { params: Record<string, string> } & { auth: AuthContext }
) => Promise<Response>

type RouteContext = { params: Record<string, string> }

// ─── withAuth ────────────────────────────────────────────────────────────────

/**
 * Route wrapper that enforces authentication.
 *
 * - Reads the Supabase session from cookies
 * - Loads the merchant's profile from the DB
 * - Injects { user, profile } into the handler as context.auth
 * - Returns 401 if not authenticated
 * - Returns 404 if profile is missing (shouldn't happen, but safe)
 *
 * Usage:
 *   export const GET = withAuth(async (req, { auth, params }) => {
 *     const { user, profile } = auth
 *     return ok({ userId: user.id })
 *   })
 */
export function withAuth(handler: AuthedHandler) {
  return async (
    request: NextRequest,
    context: RouteContext
  ): Promise<Response> => {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return fail(new UnauthorizedError())
      }

      // Load profile — created by DB trigger on signup
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        return fail(new NotFoundError("Profil"))
      }

      return await handler(request, {
        ...context,
        auth: {
          user: {
            id: user.id,
            email: user.email ?? "",
          },
          profile,
        },
      })
    } catch (err) {
      const { fail: failFn } = await import("./response")
      return failFn(err)
    }
  }
}