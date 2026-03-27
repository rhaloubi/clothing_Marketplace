import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

/**
 * Multi-tenant middleware — the heart of the platform.
 *
 * Runs on every request. Responsibilities:
 *
 * 1. Refresh Supabase auth session (required by @supabase/ssr on every request)
 * 2. Resolve subdomain → tenant (storefront routing)
 * 3. Protect /dashboard routes (redirect to /login if unauthenticated)
 * 4. Redirect authenticated users away from /login and /signup
 *
 * Routing logic:
 *
 *   mystore.platform.ma/*       → rewrites to /mystore/* internally
 *   platform.ma/dashboard/*     → protected, auth required
 *   platform.ma/login           → redirects to /dashboard if already logged in
 *
 * Local dev (add to /etc/hosts):
 *   127.0.0.1  platform.localhost
 *   127.0.0.1  mystore.localhost
 *
 *   Then visit: http://mystore.localhost:3000
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "platform.localhost"

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // OpenAPI + Swagger UI — dev only (defense in depth; routes also 404 in prod)
  if (process.env.NODE_ENV === "production") {
    if (pathname === "/api-docs" || pathname === "/api/openapi.json") {
      return new NextResponse(null, { status: 404 })
    }
  }

  // API routes should not pay auth-refresh middleware overhead.
  // Route-level wrappers handle auth/plan/rate-limit explicitly.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // ── 1. Build response + Supabase client ───────────────────────────────────
  // We must create the client here (not import createClient from server.ts)
  // because middleware cannot use next/headers — it runs in the Edge runtime.
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies onto both the request (for downstream) and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: always call getUser() — it refreshes the session token.
  // Never use getSession() here; it doesn't validate the JWT server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── 2. Subdomain detection ────────────────────────────────────────────────
  const subdomain = getSubdomain(hostname, ROOT_DOMAIN)

  // ── 3. Subdomain → storefront rewrite ────────────────────────────────────
  if (subdomain) {
    // Rewrite internally: mystore.platform.ma/products/shirt
    //                  →  /mystore/products/shirt
    // The browser URL never changes — the user still sees mystore.platform.ma
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/${subdomain}${pathname}`
    return NextResponse.rewrite(rewriteUrl, { headers: response.headers })
  }

  // ── 4. Dashboard protection ───────────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url)
      // Preserve the intended destination so we can redirect back after login
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  // ── 5. Auth page redirect ─────────────────────────────────────────────────
  // Don't let logged-in users see /login or /signup
  if (pathname === "/login" || pathname === "/signup") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return response
  }

  return response
}

/**
 * Extract subdomain from hostname.
 *
 * rootDomain = "platform.ma"
 *   mystore.platform.ma   → "mystore"
 *   www.platform.ma       → null  (treat www as root)
 *   platform.ma           → null
 *
 * rootDomain = "platform.localhost"
 *   mystore.localhost     → "mystore"
 *   localhost             → null
 */
function getSubdomain(hostname: string, rootDomain: string): string | null {
  // Strip port for local dev: "mystore.localhost:3000" → "mystore.localhost"
  const host = hostname.split(":")[0] ?? hostname
  const root = rootDomain.split(":")[0] ?? rootDomain

  if (!host.endsWith(`.${root}`) && host !== root) {
    // Custom domain — not a subdomain of our root (handle separately later)
    return null
  }

  if (host === root) return null

  const sub = host.slice(0, host.length - root.length - 1) // strip ".root"

  if (!sub || sub === "www") return null

  // Basic safety: only allow valid slug characters
  if (!/^[a-z0-9-]+$/.test(sub)) return null

  return sub
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     * - Public image/font files
     *
     * This ensures middleware doesn't run on static assets — important
     * for performance since middleware runs on every matched request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
}