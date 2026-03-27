/**
 * Plain-text message bodies for WhatsApp notifications (French).
 */

export function newOrderMerchantMessage(params: {
  storeName: string
  orderNumber: string
  totalMad: number
  customerName: string
  customerPhone: string
}): string {
  return (
    `Nouvelle commande — ${params.storeName}\n` +
    `${params.orderNumber} · ${params.totalMad} MAD\n` +
    `Client : ${params.customerName}\n` +
    `Tél. : ${params.customerPhone}`
  )
}

export function orderConfirmedCustomerMessage(params: {
  orderNumber: string
  storeName: string
}): string {
  return (
    `Bonjour — ${params.storeName}\n` +
    `Votre commande ${params.orderNumber} est confirmée. Nous préparons l'envoi.\n` +
    `Merci pour votre achat.`
  )
}

export function orderShippedCustomerMessage(params: {
  orderNumber: string
  storeName: string
  trackingNumber?: string | null
}): string {
  const track =
    params.trackingNumber && params.trackingNumber.length > 0
      ? `\nSuivi : ${params.trackingNumber}`
      : ""
  return (
    `Bonjour — ${params.storeName}\n` +
    `Votre commande ${params.orderNumber} a été expédiée.${track}\n` +
    `Merci pour votre achat.`
  )
}
