import { withWebhook, verifyWhatsAppWebhook, ok } from "@/lib/api"
import type { NextRequest } from "next/server"
import {
  summarizeWhatsAppWebhookBody,
  whatsappWebhookBodySchema,
} from "@/lib/whatsapp"

export const GET = (request: NextRequest) => verifyWhatsAppWebhook(request)

/**
 * Inbound WhatsApp Cloud webhooks — verified with `WHATSAPP_APP_SECRET` (X-Hub-Signature-256).
 * Parses payload and returns a small non-PII summary. Always responds with 200 after verification
 * so Meta does not retry on unknown shapes (extend `summarize*` / handlers for business logic).
 */
export const POST = withWebhook("whatsapp")(async (_req, { rawBody }) => {
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawBody) as unknown
  } catch {
    return ok({ received: false, reason: "invalid_json" as const })
  }

  const parsed = whatsappWebhookBodySchema.safeParse(parsedJson)
  if (!parsed.success) {
    return ok({
      received: true,
      recognized: false as const,
      issueCount: parsed.error.issues.length,
    })
  }

  const summary = summarizeWhatsAppWebhookBody(parsed.data)
  if (process.env.NODE_ENV === "development") {
    console.info("[whatsapp] webhook", summary)
  }

  return ok({
    received: true,
    recognized: true as const,
    summary,
  })
})
