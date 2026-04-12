import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { OrderStatus } from "@/types"

// ─── Tailwind class merging ───────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Price formatting ─────────────────────────────────────────────────────────

/**
 * Format an integer MAD price for display.
 *   150  → "150 MAD"
 *   1500 → "1 500 MAD"   (locale grouping)
 */
export function formatPrice(
  amountMad: number,
  options: { showCurrency?: boolean; locale?: string } = {}
): string {
  const { showCurrency = true, locale = "fr-MA" } = options

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMad)

  return showCurrency ? `${formatted} MAD` : formatted
}

// ─── Slug generation ──────────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from any string.
 *   "T-shirt Oversized ROUGE" → "t-shirt-oversized-rouge"
 *   "Djellaba بوسعادة"        → "djellaba"  (Arabic stripped, Latin kept)
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics (é→e)
    .replace(/[^\w\s-]/g, "")          // remove non-word chars
    .replace(/[\s_]+/g, "-")           // spaces/underscores → hyphens
    .replace(/^-+|-+$/g, "")           // trim leading/trailing hyphens
    .slice(0, 80)                       // max length
}

/** Trim and capitalize first letter only (merchant category labels). */
export function normalizeProductCategoryLabel(value: string): string {
  const t = value.trim()
  if (!t) return ""
  return t.charAt(0).toLocaleUpperCase("fr-FR") + t.slice(1)
}

// ─── Order number ─────────────────────────────────────────────────────────────

/**
 * Generate a human-readable per-store order number.
 *   existingCount=0  → "#1001"
 *   existingCount=41 → "#1042"
 */
export function generateOrderNumber(existingCount: number): string {
  return `#${String(1000 + existingCount + 1).padStart(4, "0")}`
}

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * "2024-03-15T10:00:00Z" → "15 mars 2024"
 */
export function formatDate(
  dateString: string,
  locale = "fr-MA"
): string {
  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * "2024-03-15T10:00:00Z" → "15 mars 2024 à 10:00"
 */
export function formatDateTime(
  dateString: string,
  locale = "fr-MA"
): string {
  return new Date(dateString).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Relative time — "il y a 3 heures"
 */
export function formatRelativeTime(
  dateString: string,
  locale = "fr"
): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const diffMs = new Date(dateString).getTime() - Date.now()
  const diffSec = diffMs / 1000

  const thresholds: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [2592000, "day"],
    [31536000, "month"],
  ]

  for (const [secs, unit] of thresholds) {
    if (Math.abs(diffSec) < secs) {
      const divisors: Record<string, number> = {
        second: 1, minute: 60, hour: 3600,
        day: 86400, month: 2592000,
      }
      return rtf.format(Math.round(diffSec / (divisors[unit] ?? 1)), unit)
    }
  }
  return rtf.format(Math.round(diffSec / 31536000), "year")
}

// ─── Order status ─────────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   "En attente",
  confirmed: "Confirmée",
  shipped:   "Expédiée",
  delivered: "Livrée",
  returned:  "Retournée",
  cancelled: "Annulée",
}

// Tailwind classes — safe to use in className
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending:   "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped:   "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  returned:  "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
}

const ORDER_STATUS_ALIAS: Record<string, OrderStatus> = {
  canceled: "cancelled",
}

export function normalizeOrderStatus(status: string): OrderStatus | null {
  const normalized = ORDER_STATUS_ALIAS[status] ?? status
  if (
    normalized === "pending" ||
    normalized === "confirmed" ||
    normalized === "shipped" ||
    normalized === "delivered" ||
    normalized === "returned" ||
    normalized === "cancelled"
  ) {
    return normalized
  }
  return null
}

export function getOrderStatusLabel(status: string): string {
  const normalized = normalizeOrderStatus(status)
  if (!normalized) return "Statut inconnu"
  return ORDER_STATUS_LABELS[normalized]
}

export function getOrderStatusColor(status: string): string {
  const normalized = normalizeOrderStatus(status)
  if (!normalized) return "bg-zinc-100 text-zinc-700"
  return ORDER_STATUS_COLORS[normalized]
}

// ─── Anonymous session ID (analytics) ────────────────────────────────────────

/**
 * Get or create a persistent anonymous session ID.
 * Stored in localStorage — client-side only.
 * Used for funnel tracking without requiring customer accounts.
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return ""

  const KEY = "msid" // marketplace session id
  let id = localStorage.getItem(KEY)

  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }

  return id
}

// ─── Device type ──────────────────────────────────────────────────────────────

export function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop"
  const w = window.innerWidth
  if (w < 768) return "mobile"
  if (w < 1024) return "tablet"
  return "desktop"
}

// ─── Error message extraction ─────────────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Une erreur inattendue s'est produite."
}

// ─── Store ownership guard ────────────────────────────────────────────────────

/**
 * Throws if userId does not own the store.
 * Used in API routes to verify resource ownership before DB calls.
 *
 * Usage (inside withUserAuth / withAuth handler):
 *   await assertStoreOwnership(supabase, storeId, auth.user.id)
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { ForbiddenError, NotFoundError } from "@/lib/api/errors"

export async function assertStoreOwnership(
  supabase: SupabaseClient,
  storeId: string,
  userId: string
): Promise<void> {
  const { data: store, error } = await supabase
    .from("stores")
    .select("id, user_id")
    .eq("id", storeId)
    .single()

  if (error ?? !store) {
    throw new NotFoundError("Boutique")
  }

  if (store.user_id !== userId) {
    throw new ForbiddenError()
  }
}