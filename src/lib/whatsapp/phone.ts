/**
 * Moroccan numbers as validated in checkout: (+212|0)[5-7] + 8 digits → WhatsApp Cloud `to` field (digits, no +).
 */
export function toWhatsAppRecipientDigits(phone: string): string | null {
  const trimmed = phone.trim()
  const moroccanPhonePattern = /^(\+212|0)([5-7][0-9]{8})$/
  const m = moroccanPhonePattern.exec(trimmed)
  if (!m) return null
  return `212${m[2]}`
}
