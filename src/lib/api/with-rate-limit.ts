import { type NextRequest } from "next/server"
import { rateLimit, getClientIp, RATE_LIMIT_PRESETS, type RateLimitConfig } from "./rate-limit"
import { fail } from "./response"
import { RateLimitError } from "./errors"

// ─── Types ────────────────────────────────────────────────────────────────────

type RateLimitHandler<C extends Record<string, unknown>> = (
  request: NextRequest,
  context: C
) => Promise<Response>

function withExtraHeaders(response: Response, extra: Record<string, string>): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// ─── withRateLimit ───────────────────────────────────────────────────────────

/**
 * Composable rate limit wrapper.
 * Works with or without withUserAuth/withAuth — uses IP for unauthenticated routes,
 * can use user ID for authenticated routes to prevent IP-sharing abuse.
 *
 * Usage (default — general API preset, keyed by IP):
 *   export const GET = withRateLimit()(handler)
 *
 * Usage (key by user ID — auth must run first so context.auth exists):
 *   export const GET = withUserAuth(withRateLimit("write", { keyBy: "user" })(handler))
 *
 * Usage (custom preset, public / IP-keyed):
 *   export const POST = withRateLimit("auth")(handler)
 *
 * Usage (custom config):
 *   export const POST = withRateLimit({ limit: 5, windowSec: 60 })(handler)
 */
export function withRateLimit(
  preset: keyof typeof RATE_LIMIT_PRESETS | RateLimitConfig = "api",
  options: { keyBy?: "ip" | "user" } = {}
) {
  return function <C extends Record<string, unknown>>(handler: RateLimitHandler<C>): RateLimitHandler<C> {
    return async (request: NextRequest, context: C): Promise<Response> => {
      const requestStart = performance.now()
      try {
        const config: RateLimitConfig =
          typeof preset === "string" ? RATE_LIMIT_PRESETS[preset] : preset

        // Low-latency default: generic dashboard "api" preset is disabled.
        // Keep strict limits on sensitive presets: auth, checkout, upload, webhook, analytics.
        if (typeof preset === "string" && preset === "api") {
          const handlerStart = performance.now()
          const response = await handler(request, context)
          const out = withExtraHeaders(response, {
            "X-RateLimit-ms": "0.00",
            "X-Handler-ms": (performance.now() - handlerStart).toFixed(2),
            "X-Request-ms": (performance.now() - requestStart).toFixed(2),
          })
          return out
        }

        // Determine rate limit key
        const { keyBy = "ip" } = options
        let identifier: string

        if (keyBy === "user") {
          // Requires withUserAuth (or withAuth) *outside* so context.auth is set
          const auth = context.auth as { user?: { id: string } } | undefined
          identifier = auth?.user?.id ?? getClientIp(request)
        } else {
          identifier = getClientIp(request)
        }

        const rateStart = performance.now()
        const { remaining, reset } = await rateLimit(identifier, config)
        const rateMs = performance.now() - rateStart

        // Call the actual handler
        const handlerStart = performance.now()
        const response = await handler(request, context)
        const handlerMs = performance.now() - handlerStart

        // Attach rate limit headers to the response
        const headers = new Headers(response.headers)
        headers.set("X-RateLimit-Limit", String(config.limit))
        headers.set("X-RateLimit-Remaining", String(remaining))
        headers.set("X-RateLimit-Reset", String(reset))
        headers.set("X-RateLimit-ms", rateMs.toFixed(2))
        headers.set("X-Handler-ms", handlerMs.toFixed(2))
        headers.set("X-Request-ms", (performance.now() - requestStart).toFixed(2))

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      } catch (err) {
        if (err instanceof RateLimitError) {
          return withExtraHeaders(fail(err), {
            "X-Request-ms": (performance.now() - requestStart).toFixed(2),
          })
        }
        return withExtraHeaders(fail(err), {
          "X-Request-ms": (performance.now() - requestStart).toFixed(2),
        })
      }
    }
  }
}