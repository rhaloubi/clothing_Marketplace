import { z } from "zod"

const uuidSchema = z.string().uuid()

/**
 * Validates the dashboard `store` query param (must be a UUID).
 * Use in Server Components from `searchParams` and in client hooks from `useSearchParams().get("store")`.
 */
export function parseStoreId(raw: string | string[] | null | undefined): string | null {
  if (raw == null) return null
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value == null || value === "") return null
  const parsed = uuidSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
