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

export interface UserAuthContext {
  user: {
    id: string
    email: string
  }
}

type RouteParams = Record<string, string>

type AuthedHandler = (
  request: NextRequest,
  context: { params: RouteParams } & { auth: AuthContext }
) => Promise<Response>

type UserAuthedHandler = (
  request: NextRequest,
  context: { params: RouteParams } & { auth: UserAuthContext }
) => Promise<Response>

/** Next.js 15 passes `params` as a Promise on dynamic routes — accept both. */
export type RouteContextInput = {
  params: Promise<RouteParams>   
}

async function resolveRouteParams(context: RouteContextInput): Promise<RouteParams> {
  return await context.params   // no need to handle undefined anymore
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

/**
 * One `createClient()` + `getUser()` per request. Reuse `supabase` for follow-up queries (e.g. profile).
 */
async function requireUserAuth(): Promise<
  | { ok: true; auth: UserAuthContext; supabase: ServerSupabase }
  | { ok: false; response: Response }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, response: fail(new UnauthorizedError()) }
  }

  return {
    ok: true,
    supabase,
    auth: {
      user: {
        id: user.id,
        email: user.email ?? "",
      },
    },
  }
}

function withTimingHeader(response: Response, key: string, ms: number): Response {
  const headers = new Headers(response.headers)
  headers.set(key, ms.toFixed(2))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

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
  return async (request: NextRequest, context: RouteContextInput): Promise<Response> => {
    const startedAt = performance.now()
    try {
      const params = await resolveRouteParams(context)
      const authCallStart = performance.now()
      const authResult = await requireUserAuth()
      const authUserMs = performance.now() - authCallStart
      if (!authResult.ok) {
        return withTimingHeader(authResult.response, "X-Auth-ms", performance.now() - startedAt)
      }

      const { supabase } = authResult

      // Load profile — created by DB trigger on signup
      const profileQueryStart = performance.now()
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authResult.auth.user.id)
        .single()
      const profileQueryMs = performance.now() - profileQueryStart

      if (profileError || !profile) {
        return withTimingHeader(
          fail(new NotFoundError("Profil")),
          "X-Auth-ms",
          performance.now() - startedAt
        )
      }

      const response = await handler(request, {
        params,
        auth: {
          user: authResult.auth.user,
          profile,
        },
      })
      const out = withTimingHeader(response, "X-Auth-ms", performance.now() - startedAt)
      out.headers.set("X-AuthUser-ms", authUserMs.toFixed(2))
      out.headers.set("X-ProfileQuery-ms", profileQueryMs.toFixed(2))
      return out
    } catch (err) {
      const { fail: failFn } = await import("./response")
      return withTimingHeader(failFn(err), "X-Auth-ms", performance.now() - startedAt)
    }
  }
}

export function withUserAuth(handler: UserAuthedHandler) {
  return async (request: NextRequest, context: RouteContextInput): Promise<Response> => {
    const startedAt = performance.now()
    try {
      const params = await resolveRouteParams(context)
      const authResult = await requireUserAuth()
      if (!authResult.ok) {
        return withTimingHeader(authResult.response, "X-Auth-ms", performance.now() - startedAt)
      }

      const response = await handler(request, {
        params,
        auth: authResult.auth,
      })
      return withTimingHeader(response, "X-Auth-ms", performance.now() - startedAt)
    } catch (err) {
      const { fail: failFn } = await import("./response")
      return withTimingHeader(failFn(err), "X-Auth-ms", performance.now() - startedAt)
    }
  }
}