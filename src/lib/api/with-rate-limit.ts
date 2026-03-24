import { type NextRequest } from "next/server"
import { rateLimit, getClientIp, RATE_LIMIT_PRESETS, type RateLimitConfig } from "./rate-limit"
import { fail } from "./response"
import { RateLimitError } from "./errors"

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyHandler = (
  request: NextRequest,
  context: Record<string, unknown>
) => Promise<Response>

// ─── withRateLimit ───────────────────────────────────────────────────────────

/**
 * Composable rate limit wrapper.
 * Works with or without withAuth — uses IP for unauthenticated routes,
 * can use user ID for authenticated routes to prevent IP-sharing abuse.
 *
 * Usage (default — general API preset, keyed by IP):
 *   export const GET = withRateLimit()(withAuth(handler))
 *
 * Usage (custom preset):
 *   export const POST = withRateLimit("auth")(handler)
 *
 * Usage (custom config):
 *   export const POST = withRateLimit({ limit: 5, windowSec: 60 })(handler)
 *
 * Usage (key by user ID for authenticated routes):
 *   export const POST = withRateLimit("api", { keyBy: "user" })(withAuth(handler))
 */
export function withRateLimit(
  preset: keyof typeof RATE_LIMIT_PRESETS | RateLimitConfig = "api",
  options: { keyBy?: "ip" | "user" } = {}
) {
  return function (handler: AnyHandler): AnyHandler {
    return async (
      request: NextRequest,
      context: Record<string, unknown>
    ): Promise<Response> => {
      try {
        const config: RateLimitConfig =
          typeof preset === "string" ? RATE_LIMIT_PRESETS[preset] : preset

        // Determine rate limit key
        const { keyBy = "ip" } = options
        let identifier: string

        if (keyBy === "user") {
          // Try to get user ID from auth context (injected by withAuth)
          const auth = context.auth as { user?: { id: string } } | undefined
          identifier = auth?.user?.id ?? getClientIp(request)
        } else {
          identifier = getClientIp(request)
        }

        const { remaining, reset } = await rateLimit(identifier, config)

        // Call the actual handler
        const response = await handler(request, context)

        // Attach rate limit headers to the response
        const headers = new Headers(response.headers)
        headers.set("X-RateLimit-Limit", String(config.limit))
        headers.set("X-RateLimit-Remaining", String(remaining))
        headers.set("X-RateLimit-Reset", String(reset))

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      } catch (err) {
        if (err instanceof RateLimitError) {
          return fail(err)
        }
        return fail(err)
      }
    }
  }
}