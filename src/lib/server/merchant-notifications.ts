import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

type Admin = SupabaseClient<Database>

/**
 * Store display name, optional merchant WhatsApp, and whether the owner's active plan includes WhatsApp (Growth+).
 * Uses service role — call only from server routes / jobs.
 */
export async function fetchStoreWhatsAppNotificationContext(
  admin: Admin,
  storeId: string
): Promise<{
  storeName: string
  merchantPhone: string | null
  hasWhatsAppFeature: boolean
} | null> {
  const { data: store, error } = await admin
    .from("stores")
    .select("name, whatsapp_number, user_id")
    .eq("id", storeId)
    .maybeSingle()

  if (error || !store) return null

  const { data: sub } = await admin
    .from("subscriptions")
    .select("plans ( has_whatsapp )")
    .eq("user_id", store.user_id)
    .eq("status", "active")
    .maybeSingle()

  const plan = sub?.plans as { has_whatsapp: boolean } | null

  return {
    storeName: store.name,
    merchantPhone: store.whatsapp_number,
    hasWhatsAppFeature: plan?.has_whatsapp === true,
  }
}
