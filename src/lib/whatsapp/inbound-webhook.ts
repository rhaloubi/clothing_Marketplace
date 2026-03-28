import { z } from "zod"

/** Loose Cloud API `value` inside `entry[].changes[]` — forward-compatible via `.passthrough()`. */
const whatsappChangeValueSchema = z
  .object({
    messaging_product: z.string().optional(),
    metadata: z
      .object({
        display_phone_number: z.string().optional(),
        phone_number_id: z.string().optional(),
      })
      .passthrough()
      .optional(),
    contacts: z.array(z.record(z.string(), z.unknown())).optional(),
    messages: z.array(z.record(z.string(), z.unknown())).optional(),
    statuses: z.array(z.record(z.string(), z.unknown())).optional(),
    errors: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough()

const whatsappChangeSchema = z
  .object({
    field: z.string().optional(),
    value: whatsappChangeValueSchema.optional(),
  })
  .passthrough()

const whatsappEntrySchema = z
  .object({
    id: z.string().optional(),
    changes: z.array(whatsappChangeSchema).optional(),
  })
  .passthrough()

export const whatsappWebhookBodySchema = z
  .object({
    object: z.string().optional(),
    entry: z.array(whatsappEntrySchema).optional(),
  })
  .passthrough()

export type WhatsAppWebhookBody = z.infer<typeof whatsappWebhookBodySchema>

/** Non-PII summary for logs / JSON response (no message bodies or phone numbers). */
export type WhatsAppWebhookSummary = {
  object: string | undefined
  entryCount: number
  changeFields: string[]
  messageCount: number
  messageTypes: string[]
  statusCount: number
  errorCount: number
}

export function summarizeWhatsAppWebhookBody(body: WhatsAppWebhookBody): WhatsAppWebhookSummary {
  const changeFields = new Set<string>()
  const messageTypes = new Set<string>()
  let messageCount = 0
  let statusCount = 0
  let errorCount = 0

  for (const ent of body.entry ?? []) {
    for (const ch of ent.changes ?? []) {
      if (ch.field) changeFields.add(ch.field)
      const v = ch.value
      if (!v) continue
      const msgs = v.messages ?? []
      messageCount += msgs.length
      for (const m of msgs) {
        const t = m.type
        if (typeof t === "string") messageTypes.add(t)
      }
      statusCount += (v.statuses ?? []).length
      errorCount += (v.errors ?? []).length
    }
  }

  return {
    object: body.object,
    entryCount: body.entry?.length ?? 0,
    changeFields: [...changeFields].sort(),
    messageCount,
    messageTypes: [...messageTypes].sort(),
    statusCount,
    errorCount,
  }
}
