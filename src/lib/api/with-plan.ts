import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fail } from "./response"
import { PlanUpgradeRequiredError, UnauthorizedError } from "./errors"
import type { UserAuthContext } from "./with-auth"
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

// ─── Redis plan cache helpers ─────────────────────────────────────────────────
// Cache key: plan:{userId}  TTL: 60 s
// Uses the same Upstash REST pipeline pattern as rate-limit.ts.
// All helpers fail open (null / no-op) when Redis is unconfigured or errors.

async function redisPipelineOnce(commands: unknown[][]): Promise<unknown[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    })
    if (!res.ok) return null
    const rows = await res.json() as Array<{ result: unknown }>
    return rows.map((r) => r.result)
  } catch {
    return null
  }
}

async function redisPlanGet(userId: string): Promise<PlanContext | null> {
  const results = await redisPipelineOnce([["GET", `plan:${userId}`]])
  if (!results) return null
  const raw = results[0]
  if (typeof raw !== "string") return null
  try { return JSON.parse(raw) as PlanContext } catch { return null }
}

async function redisPlanSet(userId: string, plan: PlanContext): Promise<void> {
  await redisPipelineOnce([["SET", `plan:${userId}`, JSON.stringify(plan), "EX", 60]])
}

/** Remove a cached plan entry — call after a subscription plan change so the next gated request loads fresh. */
export async function invalidatePlanCache(userId: string): Promise<void> {
  await redisPipelineOnce([["DEL", `plan:${userId}`]])
}

function withTimingHeader(response: Response, key: string, ms: number): Response {
  const headers = new Headers(response.headers)
  headers.set(key, ms.toFixed(2))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanContext {
  planName: PlanName
  maxStores: number
  maxProducts: number | null
  features: Record<PlanFeature, boolean>
}

type PlanAuthContext = UserAuthContext & { plan: PlanContext }

type PlanHandler = (
  request: NextRequest,
  context: { params: Record<string, string> } & { auth: PlanAuthContext }
) => Promise<Response>

type RouteWithAuthContext = {
  params: Record<string, string>
  auth: UserAuthContext
}

// ─── withPlan ────────────────────────────────────────────────────────────────

/**
 * Route wrapper that enforces plan feature gates.
 * Must be used INSIDE withUserAuth (identity in context; no profile required).
 *
 * Usage (single feature check):
 *   export const GET = withUserAuth(
 *     withPlan("has_analytics")(async (req, { auth }) => {
 *       const { user, plan } = auth
 *       return ok({ planName: plan.planName })
 *     })
 *   )
 *
 * Usage (no feature check — just load plan context):
 *   export const GET = withUserAuth(
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
      const startedAt = performance.now()
      try {
        const userId = context.auth.user.id

        const cached = await redisPlanGet(userId)
        if (cached) {
          if (requiredFeature && !cached.features[requiredFeature]) {
            const requiredPlan = FEATURE_MIN_PLAN[requiredFeature]
            return withTimingHeader(
              fail(new PlanUpgradeRequiredError(requiredPlan)),
              "X-Plan-ms",
              performance.now() - startedAt
            )
          }
          const response = await handler(request, {
            ...context,
            auth: {
              ...context.auth,
              plan: cached,
            },
          })
          return withTimingHeader(response, "X-Plan-ms", performance.now() - startedAt)
        }

        const supabase = await createClient()

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
          return withTimingHeader(
            fail(new UnauthorizedError("Abonnement introuvable.")),
            "X-Plan-ms",
            performance.now() - startedAt
          )
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
          return withTimingHeader(
            fail(new UnauthorizedError("Plan introuvable.")),
            "X-Plan-ms",
            performance.now() - startedAt
          )
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
        // Fire-and-forget — cache miss is not fatal
        void redisPlanSet(userId, planContext)

        // Feature gate check
        if (requiredFeature && !planContext.features[requiredFeature]) {
          const requiredPlan = FEATURE_MIN_PLAN[requiredFeature]
          return withTimingHeader(
            fail(new PlanUpgradeRequiredError(requiredPlan)),
            "X-Plan-ms",
            performance.now() - startedAt
          )
        }

        const response = await handler(request, {
          ...context,
          auth: {
            ...context.auth,
            plan: planContext,
          },
        })
        return withTimingHeader(response, "X-Plan-ms", performance.now() - startedAt)
      } catch (err) {
        return withTimingHeader(fail(err), "X-Plan-ms", performance.now() - startedAt)
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