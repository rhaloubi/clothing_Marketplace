/**
 * Public API of lib/api — security layer.
 *
 * Import everything from "@/lib/api" instead of individual files.
 *
 * Usage in a route:
 *   import { withAuth, withRateLimit, withPlan, ok, fail, NotFoundError } from "@/lib/api"
 */

// Response helpers
export { ok, created, noContent, fail, handle } from "./response"

// Error classes
export {
  ApiError,
  ValidationError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  PlanUpgradeRequiredError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  serializeError,
} from "./errors"

// Rate limiting
export {
  rateLimit,
  getClientIp,
  RATE_LIMIT_PRESETS,
  type RateLimitConfig,
} from "./rate-limit"

// Route wrappers
export { withAuth, type AuthContext, type RouteContextInput } from "./with-auth"
export {
  withPlan,
  assertProductLimit,
  assertStoreLimit,
  type PlanFeature,
  type PlanContext,
} from "./with-plan"
export {
  withWebhook,
  verifyWhatsAppWebhook,
} from "./with-webhook"
export { withRateLimit } from "./with-rate-limit"