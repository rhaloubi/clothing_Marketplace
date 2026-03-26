import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { NotFoundError } from "@/lib/api/errors"

type SB = SupabaseClient<Database>

export async function assertShippingZoneInStore(
  supabase: SB,
  zoneId: string,
  storeId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("shipping_zones")
    .select("id, store_id")
    .eq("id", zoneId)
    .maybeSingle()

  if (error) throw error
  if (data?.store_id !== storeId) {
    throw new NotFoundError("Zone de livraison")
  }
}
