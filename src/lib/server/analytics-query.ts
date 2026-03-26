import type { NextRequest } from "next/server"
import { ValidationError } from "@/lib/api/errors"
import { analyticsRangeQuerySchema } from "@/lib/validations"

export function parseAnalyticsRangeQuery(req: NextRequest): {
  store_id: string
  from: string
  to: string
} {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = analyticsRangeQuerySchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    throw new ValidationError(
      first?.message ?? "Paramètres invalides.",
      Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
    )
  }

  const from =
    parsed.data.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const to = parsed.data.to ?? new Date().toISOString()

  return { store_id: parsed.data.store_id, from, to }
}

export function orderCountsAsRevenue(status: string): boolean {
  return status !== "cancelled" && status !== "returned"
}
