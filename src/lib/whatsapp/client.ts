import { env } from "@/env.js"

function normalizeWhatsAppTo(to: string): string {
  return to.replace(/^\+/, "").replace(/\s/g, "")
}

/**
 * Send a freeform text message via WhatsApp Cloud API.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<unknown> {
  const url = `${env.WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizeWhatsAppTo(to),
      type: "text",
      text: { preview_url: false, body },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WhatsApp API ${res.status}: ${text}`)
  }

  return res.json() as Promise<unknown>
}
