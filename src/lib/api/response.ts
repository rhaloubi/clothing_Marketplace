import { NextResponse } from "next/server"
import { serializeError, RateLimitError } from "./errors"

// ─── Success ─────────────────────────────────────────────────────────────────

/**
 * Return a successful JSON response.
 *
 * Usage:
 *   return ok({ store })                    → 200
 *   return ok({ store }, 201)               → 201 Created
 *   return ok({ stores, meta: { total } })  → 200 with pagination
 */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, error: null }, { status })
}

/**
 * Shorthand for 201 Created.
 */
export function created<T>(data: T): NextResponse {
  return ok(data, 201)
}

/**
 * 204 No Content — for DELETE responses.
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * Return an error JSON response from any error type.
 *
 * Usage:
 *   return fail(new NotFoundError("Produit"))
 *   return fail(new ValidationError("Invalide", { name: "Requis" }))
 *   return fail(err)  ← catches anything, logs unknowns
 */
export function fail(err: unknown): NextResponse {
  const { message, code, status, fields, retryAfter } = serializeError(err)

  const body: Record<string, unknown> = {
    data: null,
    error: { message, code },
  }

  if (fields) body.error = { ...(body.error as object), fields }

  const headers: Record<string, string> = {}

  if (err instanceof RateLimitError && retryAfter) {
    headers["Retry-After"] = String(retryAfter)
    headers["X-RateLimit-Reset"] = String(Date.now() + retryAfter * 1000)
  }

  return NextResponse.json(body, { status, headers })
}

// ─── Try-catch wrapper ────────────────────────────────────────────────────────

/**
 * Wraps an async handler in a try/catch that automatically calls fail().
 * Eliminates boilerplate try/catch in every route.
 *
 * Usage:
 *   export const GET = handle(async (req) => {
 *     const store = await getStore()
 *     if (!store) throw new NotFoundError("Store")
 *     return ok(store)
 *   })
 */
export function handle(
  fn: (...args: unknown[]) => Promise<NextResponse>
): (...args: unknown[]) => Promise<NextResponse> {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      return fail(err)
    }
  }
}