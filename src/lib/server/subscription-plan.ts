import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { ConflictError } from "@/lib/api/errors"

type SB = SupabaseClient<Database>

/** Numeric tier order — higher is more permissive. */
const PLAN_TIER: Record<string, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
}

/** True when target plan is strictly more restrictive than current. */
export function isDowngrade(currentPlanName: string, targetPlanName: string): boolean {
  return (PLAN_TIER[targetPlanName] ?? 0) < (PLAN_TIER[currentPlanName] ?? 0)
}

/**
 * Guards a plan downgrade by ensuring the merchant's current usage fits within the target plan limits.
 * Uses active-only counts (is_active = true) to stay consistent with assertProductLimit in with-plan.ts.
 *
 * Throws ConflictError with a French message if the merchant exceeds either limit.
 * Call only when isDowngrade() is true (upgrades have no data-loss risk).
 */
export async function assertDowngradeSafe(
  supabase: SB,
  userId: string,
  target: { max_stores: number; max_products: number | null }
): Promise<void> {
  // 1. Store count
  const { count: storeCount, error: sErr } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (sErr) throw sErr

  if ((storeCount ?? 0) > target.max_stores) {
    throw new ConflictError(
      `Vous avez ${storeCount} boutique(s). Le plan cible n'en autorise que ${target.max_stores}. Supprimez des boutiques avant de changer de plan.`
    )
  }

  // 2. Active product count — only when the target plan has a product ceiling
  if (target.max_products !== null) {
    const { data: storeIds, error: siErr } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", userId)

    if (siErr) throw siErr

    const ids = (storeIds ?? []).map((s) => s.id)

    if (ids.length > 0) {
      const { count: productCount, error: pErr } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .in("store_id", ids)
        .eq("is_active", true)

      if (pErr) throw pErr

      if ((productCount ?? 0) > target.max_products) {
        throw new ConflictError(
          `Vous avez ${productCount} produit(s) actif(s). Le plan cible n'en autorise que ${target.max_products}. Désactivez des produits avant de changer de plan.`
        )
      }
    }
  }
}
