"use client"

import { getSessionId, getDeviceType } from "@/lib/utils"
import type { AnalyticsEventType } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrackOptions {
  store_id: string
  event_type: AnalyticsEventType
  product_id?: string
  order_id?: string
  wilaya_id?: number
}

// ─── track() ─────────────────────────────────────────────────────────────────

/**
 * Track an analytics event from the storefront.
 *
 * Fire-and-forget — never awaited, never blocks UI rendering.
 * Reads UTM params and referrer from the current page automatically.
 * Attaches an anonymous session ID from localStorage for funnel tracking.
 *
 * Safe to call on every product view, cart action, or page load.
 * Analytics failures are always silent — they never break the user experience.
 *
 * Usage:
 *   track({ store_id, event_type: "product_view", product_id })
 *   track({ store_id, event_type: "order_placed", order_id })
 */
export function track(options: TrackOptions): void {
  // Don't block — fire async in background, discard the promise
  void sendEvent(options)
}

// ─── Internal sender ─────────────────────────────────────────────────────────

async function sendEvent(options: TrackOptions): Promise<void> {
  try {
    const params = new URLSearchParams(window.location.search)

    const payload = {
      ...options,
      session_id:   getSessionId(),
      device_type:  getDeviceType(),
      referrer:     document.referrer || undefined,
      utm_source:   params.get("utm_source")   ?? undefined,
      utm_medium:   params.get("utm_medium")   ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
    }

    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // keepalive: true ensures the request completes even if the user
      // navigates away before it finishes (e.g. checkout_start tracking)
      keepalive: true,
    })
  } catch {
    // Never throw — analytics must never crash the storefront
  }
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Track a page view. Call from the top of each storefront page.
 *
 * Usage:
 *   useEffect(() => { trackPageView(store_id) }, [])
 */
export function trackPageView(store_id: string): void {
  track({ store_id, event_type: "page_view" })
}

/**
 * Track a product page view.
 */
export function trackProductView(store_id: string, product_id: string): void {
  track({ store_id, event_type: "product_view", product_id })
}

/**
 * Track add to cart.
 */
export function trackCartAdd(store_id: string, product_id: string): void {
  track({ store_id, event_type: "cart_add", product_id })
}

/**
 * Track checkout started (customer opened the checkout page).
 */
export function trackCheckoutStart(store_id: string): void {
  track({ store_id, event_type: "checkout_start" })
}

/**
 * Track a completed order.
 * Call this after the order is successfully placed.
 */
export function trackOrderPlaced(
  store_id: string,
  order_id: string,
  wilaya_id: number
): void {
  track({ store_id, event_type: "order_placed", order_id, wilaya_id })
}