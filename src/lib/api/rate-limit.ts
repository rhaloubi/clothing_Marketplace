import { RateLimitError } from "./errors"

// ─── Config ───────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSec: number
  /**
   * Key prefix — used to namespace different limiters.
   * e.g. "checkout", "auth", "api"
   */
  prefix?: string
}

// Presets for common endpoints
export const RATE_LIMIT_PRESETS = {
  // Auth — tight, prevents brute force
  auth: { limit: 10, windowSec: 60, prefix: "auth" },
  // Guest checkout — moderate, one real order takes a few seconds
  checkout: { limit: 20, windowSec: 60, prefix: "checkout" },
  // Analytics events — loose, one per user action
  analytics: { limit: 120, windowSec: 60, prefix: "analytics" },
  // General API — default for dashboard routes
  api: { limit: 60, windowSec: 60, prefix: "api" },
  // Upload — low, each upload is a real file
  upload: { limit: 30, windowSec: 60, prefix: "upload" },
  // Webhooks — very loose, delivery providers can send many
  webhook: { limit: 500, windowSec: 60, prefix: "webhook" },
} as const satisfies Record<string, RateLimitConfig>

// ─── Core rate limiter ────────────────────────────────────────────────────────

/**
 * Sliding window rate limiter using Upstash Redis REST API.
 *
 * Uses a simple counter + expiry approach over the Upstash REST API
 * (no SDK needed — just fetch). This keeps the bundle lean and
 * works cleanly in Next.js serverless functions.
 *
 * Throws RateLimitError if the limit is exceeded.
 * Returns { remaining, reset } if allowed.
 *
 * Usage:
 *   const ip = request.headers.get("x-forwarded-for") ?? "unknown"
 *   await rateLimit(ip, RATE_LIMIT_PRESETS.auth)
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ remaining: number; reset: number }> {
  const { limit, windowSec, prefix = "rl" } = config

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  // If Redis isn't configured (e.g. local dev without .env), skip silently
  if (!url || !token) {
    return { remaining: limit - 1, reset: Date.now() + windowSec * 1000 }
  }

  const key = `${prefix}:${identifier}`
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - windowSec

  try {
    // Pipeline two commands:
    // 1. ZREMRANGEBYSCORE — remove old entries outside the window
    // 2. ZADD             — add current timestamp as a scored member
    // 3. ZCARD            — count entries in window
    // 4. EXPIRE           — keep key alive for one window
    const pipeline = [
      ["ZREMRANGEBYSCORE", key, "-inf", windowStart],
      ["ZADD", key, now, `${now}-${Math.random()}`],
      ["ZCARD", key],
      ["EXPIRE", key, windowSec],
    ]

    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    })

    if (!response.ok) {
      // Redis error — fail open (don't block the request)
      console.warn("[RateLimit] Redis pipeline failed:", response.status)
      return { remaining: limit - 1, reset: Date.now() + windowSec * 1000 }
    }

    const results = await response.json() as Array<{ result: unknown }>
    const count = results[2]?.result as number ?? 0

    if (count > limit) {
      const retryAfter = windowSec
      throw new RateLimitError(retryAfter)
    }

    return {
      remaining: Math.max(0, limit - count),
      reset: (now + windowSec) * 1000,
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    // Unexpected Redis error — fail open
    console.warn("[RateLimit] Unexpected error:", err)
    return { remaining: limit - 1, reset: Date.now() + windowSec * 1000 }
  }
}

// ─── IP extraction helper ────────────────────────────────────────────────────

/**
 * Extract the real client IP from a Next.js request.
 * Handles Vercel's x-forwarded-for header.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    // x-forwarded-for can be "ip1, ip2, ip3" — first is the real client
    return forwarded.split(",")[0]?.trim() ?? "unknown"
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}