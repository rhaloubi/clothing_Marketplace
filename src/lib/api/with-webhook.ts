import { type NextRequest } from "next/server"
import { fail } from "./response"
import { UnauthorizedError, BadRequestError } from "./errors"

// ─── Types ────────────────────────────────────────────────────────────────────

type WebhookHandler = (
  request: NextRequest,
  context: {
    params: Record<string, string>
    rawBody: string
  }
) => Promise<Response>

// ─── HMAC helpers ────────────────────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 of a message with a secret.
 * Uses the Web Crypto API (available in Node.js 18+ and Edge runtime).
 */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  )
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// ─── withWebhook ─────────────────────────────────────────────────────────────

/**
 * Route wrapper that verifies incoming webhook signatures.
 *
 * Supports two verification strategies:
 *
 * 1. "hmac" / "delivery" — validates X-Signature-256 with `DELIVERY_WEBHOOK_SECRET`
 *    Header format: sha256=<hex>
 *
 * 2. "whatsapp" — validates X-Hub-Signature-256 (Meta's format)
 *    Used by: WhatsApp Business Cloud API
 *    Header format: sha256=<hex>
 *
 * Usage:
 *   export const POST = withWebhook()(async (req, { rawBody }) => {
 *     const payload = JSON.parse(rawBody)
 *     return ok({ received: true })
 *   })
 *
 *   // WhatsApp specific
 *   export const POST = withWebhook("whatsapp")(handler)
 */
export function withWebhook(
  strategy: "hmac" | "delivery" | "whatsapp" | "cron" = "delivery"
) {
  return function (handler: WebhookHandler) {
    async function resolveParams(
      params?: Record<string, string> | Promise<Record<string, string>>
    ): Promise<Record<string, string>> {
      if (!params) return {}
      return await Promise.resolve(params)
    }

    return async (
      request: NextRequest,
      context: { params?: Record<string, string> | Promise<Record<string, string>> }
    ): Promise<Response> => {
      try {
        const params = await resolveParams(context.params)
        // ── Cron jobs: simple secret header ──────────────────────────────────
        if (strategy === "cron") {
          const cronSecret = process.env.CRON_SECRET
          if (!cronSecret) {
            console.error("[Webhook] CRON_SECRET not set")
            return fail(new UnauthorizedError())
          }
          const authHeader = request.headers.get("authorization")
          if (authHeader !== `Bearer ${cronSecret}`) {
            return fail(new UnauthorizedError("Cron secret invalide."))
          }
          const rawBody = await request.text()
          return await handler(request, { params, rawBody })
        }

        // ── HMAC / delivery / WhatsApp: signature verification ─────────────────
        const secret =
          strategy === "whatsapp"
            ? process.env.WHATSAPP_APP_SECRET
            : process.env.DELIVERY_WEBHOOK_SECRET

        if (!secret) {
          console.error(`[Webhook] Secret not configured for strategy: ${strategy}`)
          return fail(new UnauthorizedError())
        }

        // Read raw body — must happen BEFORE any other body parsing
        const rawBody = await request.text()

        if (!rawBody) {
          return fail(new BadRequestError("Corps de requête vide."))
        }

        // Get signature header
        const signatureHeader =
          strategy === "whatsapp"
            ? request.headers.get("x-hub-signature-256")
            : request.headers.get("x-signature-256")

        if (!signatureHeader) {
          return fail(
            new UnauthorizedError("Signature manquante dans les headers.")
          )
        }

        // Signature format: "sha256=<hex>"
        const [prefix, receivedSig] = signatureHeader.split("=")
        if (prefix !== "sha256" || !receivedSig) {
          return fail(new UnauthorizedError("Format de signature invalide."))
        }

        // Compute expected signature
        const expectedSig = await hmacSha256(secret, rawBody)

        // Constant-time comparison
        if (!timingSafeEqual(expectedSig, receivedSig)) {
          console.warn(
            `[Webhook] Signature mismatch for strategy: ${strategy}`,
            { expected: expectedSig.slice(0, 8), received: receivedSig.slice(0, 8) }
          )
          return fail(new UnauthorizedError("Signature invalide."))
        }

        return await handler(request, { params, rawBody })
      } catch (err) {
        return fail(err)
      }
    }
  }
}

// ─── WhatsApp GET verification (one-time hub challenge) ──────────────────────

/**
 * Handles the one-time GET request Meta sends to verify the webhook URL.
 * Returns the hub.challenge value if the token matches.
 *
 * Usage in the WhatsApp webhook route:
 *   export const GET = verifyWhatsAppWebhook
 */
export function verifyWhatsAppWebhook(request: NextRequest): Response {
  const { searchParams } = new URL(request.url)

  const mode      = searchParams.get("hub.mode")
  const token     = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 })
  }

  return new Response("Forbidden", { status: 403 })
}