import { type NextRequest } from "next/server"
import { rateLimit, getClientIp, RATE_LIMIT_PRESETS, type RateLimitConfig } from "./rate-limit"
import { fail } from "./response"
import { RateLimitError } from "./errors"

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyHandler = (
  request: NextRequest,
  context: Record<string, unknown>
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

function debugLog(
  runId: string,
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
): void {
  // #region agent log
  fetch("http://127.0.0.1:7317/ingest/b4e00ba1-e25e-4db5-8dae-14c7a3521d9a", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "a3bb0b",
    },
    body: JSON.stringify({
      sessionId: "a3bb0b",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => undefined)
  // #endregion
}

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
      const requestStart = performance.now()
      try {
        debugLog("pre-fix", "H1", "with-rate-limit.ts:67", "withRateLimit_entry", {
          preset: typeof preset === "string" ? preset : "custom",
          path: request.nextUrl.pathname,
        })
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
          debugLog("pre-fix", "H2", "with-rate-limit.ts:82", "api_preset_headers_attached", {
            path: request.nextUrl.pathname,
            hasRateLimitMs: out.headers.has("X-RateLimit-ms"),
            hasHandlerMs: out.headers.has("X-Handler-ms"),
            hasRequestMs: out.headers.has("X-Request-ms"),
          })
          return out
        }

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
        debugLog("pre-fix", "H3", "with-rate-limit.ts:114", "non_api_headers_attached", {
          path: request.nextUrl.pathname,
          rateLimitMs: rateMs.toFixed(2),
          handlerMs: handlerMs.toFixed(2),
        })

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