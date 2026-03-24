import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fail } from "./response"
import { PlanUpgradeRequiredError, UnauthorizedError } from "./errors"
import type { AuthContext } from "./with-auth"
import type { PlanName } from "@/types"

// ─── Feature flag map ────────────────────────────────────────────────────────

/**
 * Maps plan feature flags (from the plans table) to their column names.
 * Matches the boolean columns on the `plans` table exactly.
 */
export type PlanFeature =
  | "has_custom_domain"
  | "has_analytics"
  | "has_whatsapp"
  | "has_staff"
  | "has_api"

/**
 * Maps plan names to the features they unlock.
 * Used for upgrade messaging.
 */
const FEATURE_MIN_PLAN: Record<PlanFeature, PlanName> = {
  has_custom_domain: "growth",
  has_analytics:     "growth",
  has_whatsapp:      "growth",
  has_staff:         "pro",
  has_api:           "pro",
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanContext {
  planName: PlanName
  maxStores: number
  maxProducts: number | null
  features: Record<PlanFeature, boolean>
}

type PlanAuthContext = AuthContext & { plan: PlanContext }

type PlanHandler = (
  request: NextRequest,
  context: { params: Record<string, string> } & { auth: PlanAuthContext }
) => Promise<Response>

type RouteWithAuthContext = {
  params: Record<string, string>
  auth: AuthContext
}

// ─── withPlan ────────────────────────────────────────────────────────────────

/**
 * Route wrapper that enforces plan feature gates.
 * Must be used INSIDE withAuth (relies on auth context).
 *
 * Usage (single feature check):
 *   export const GET = withAuth(
 *     withPlan("has_analytics")(async (req, { auth }) => {
 *       const { user, plan } = auth
 *       return ok({ planName: plan.planName })
 *     })
 *   )
 *
 * Usage (no feature check — just load plan context):
 *   export const GET = withAuth(
 *     withPlan()(async (req, { auth }) => {
 *       return ok({ maxProducts: auth.plan.maxProducts })
 *     })
 *   )
 */
export function withPlan(requiredFeature?: PlanFeature) {
  return function (handler: PlanHandler) {
    return async (
      request: NextRequest,
      context: RouteWithAuthContext
    ): Promise<Response> => {
      try {
        const supabase = await createClient()
        const userId = context.auth.user.id

        // Load active subscription + plan in one query
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select(`
            status,
            plans (
              name,
              max_stores,
              max_products,
              has_custom_domain,
              has_analytics,
              has_whatsapp,
              has_staff,
              has_api
            )
          `)
          .eq("user_id", userId)
          .eq("status", "active")
          .single()

        if (!subscription) {
          return fail(new UnauthorizedError("Abonnement introuvable."))
        }

        const plan = subscription.plans as {
          name: PlanName
          max_stores: number
          max_products: number | null
          has_custom_domain: boolean
          has_analytics: boolean
          has_whatsapp: boolean
          has_staff: boolean
          has_api: boolean
        } | null

        if (!plan) {
          return fail(new UnauthorizedError("Plan introuvable."))
        }

        const planContext: PlanContext = {
          planName: plan.name,
          maxStores: plan.max_stores,
          maxProducts: plan.max_products,
          features: {
            has_custom_domain: plan.has_custom_domain,
            has_analytics:     plan.has_analytics,
            has_whatsapp:      plan.has_whatsapp,
            has_staff:         plan.has_staff,
            has_api:           plan.has_api,
          },
        }

        // Feature gate check
        if (requiredFeature && !planContext.features[requiredFeature]) {
          const requiredPlan = FEATURE_MIN_PLAN[requiredFeature]
          return fail(new PlanUpgradeRequiredError(requiredPlan))
        }

        return await handler(request, {
          ...context,
          auth: {
            ...context.auth,
            plan: planContext,
          },
        })
      } catch (err) {
        return fail(err)
      }
    }
  }
}

// ─── Product count guard ──────────────────────────────────────────────────────

/**
 * Checks if the merchant has reached their product limit.
 * Call this inside a POST /api/products handler before inserting.
 *
 * Usage:
 *   await assertProductLimit(storeId, planContext)
 *   // throws ForbiddenError if limit reached
 */
export async function assertProductLimit(
  storeId: string,
  plan: PlanContext
): Promise<void> {
  if (plan.maxProducts === null) return // unlimited

  const supabase = await createClient()
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true)

  if ((count ?? 0) >= plan.maxProducts) {
    throw new PlanUpgradeRequiredError(
      "growth",
      `Votre plan est limité à ${plan.maxProducts} produits actifs. Passez au plan Growth pour en ajouter davantage.`
    )
  }
}

// ─── Store count guard ────────────────────────────────────────────────────────

/**
 * Checks if the merchant has reached their store limit.
 * Call this inside a POST /api/stores handler before inserting.
 */
export async function assertStoreLimit(
  userId: string,
  plan: PlanContext
): Promise<void> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if ((count ?? 0) >= plan.maxStores) {
    throw new PlanUpgradeRequiredError(
      "pro",
      `Votre plan permet ${plan.maxStores} boutique(s). Passez au plan Pro pour en créer davantage.`
    )
  }
}