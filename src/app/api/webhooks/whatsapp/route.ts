import {
  withWebhook,
  verifyWhatsAppWebhook,
  ok,
  fail,
  BadRequestError,
} from "@/lib/api"
import type { NextRequest } from "next/server"

export const GET = (request: NextRequest) => verifyWhatsAppWebhook(request)

/**
 * Inbound WhatsApp Cloud webhooks — verified with `WHATSAPP_APP_SECRET` (X-Hub-Signature-256).
 * Extend this handler to process `messages`, `statuses`, etc.
 */
export const POST = withWebhook("whatsapp")(async (_req, { rawBody }) => {
  try {
    JSON.parse(rawBody) as unknown
  } catch {
    return fail(new BadRequestError("JSON invalide."))
  }
  return ok({ received: true })
})
