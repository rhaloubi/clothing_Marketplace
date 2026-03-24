/**
 * Typed API error classes.
 *
 * Every error has:
 *  - message  → shown to the client
 *  - status   → HTTP status code
 *  - code     → machine-readable string for the frontend to handle programmatically
 */

export class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code: string
    ) {
      super(message)
      this.name = "ApiError"
    }
  }
  
  // ─── 400 ─────────────────────────────────────────────────────────────────────
  
  export class ValidationError extends ApiError {
    constructor(
      message: string,
      public readonly fields?: Record<string, string>
    ) {
      super(message, 400, "VALIDATION_ERROR")
      this.name = "ValidationError"
    }
  }
  
  export class BadRequestError extends ApiError {
    constructor(message = "Requête invalide.") {
      super(message, 400, "BAD_REQUEST")
      this.name = "BadRequestError"
    }
  }
  
  // ─── 401 ─────────────────────────────────────────────────────────────────────
  
  export class UnauthorizedError extends ApiError {
    constructor(message = "Authentification requise.") {
      super(message, 401, "UNAUTHORIZED")
      this.name = "UnauthorizedError"
    }
  }
  
  // ─── 403 ─────────────────────────────────────────────────────────────────────
  
  export class ForbiddenError extends ApiError {
    constructor(message = "Accès refusé.") {
      super(message, 403, "FORBIDDEN")
      this.name = "ForbiddenError"
    }
  }
  
  export class PlanUpgradeRequiredError extends ApiError {
    constructor(
      public readonly requiredPlan: string,
      message?: string
    ) {
      super(
        message ?? `Cette fonctionnalité nécessite le plan ${requiredPlan}.`,
        403,
        "PLAN_UPGRADE_REQUIRED"
      )
      this.name = "PlanUpgradeRequiredError"
    }
  }
  
  // ─── 404 ─────────────────────────────────────────────────────────────────────
  
  export class NotFoundError extends ApiError {
    constructor(resource = "Ressource") {
      super(`${resource} introuvable.`, 404, "NOT_FOUND")
      this.name = "NotFoundError"
    }
  }
  
  // ─── 409 ─────────────────────────────────────────────────────────────────────
  
  export class ConflictError extends ApiError {
    constructor(message: string) {
      super(message, 409, "CONFLICT")
      this.name = "ConflictError"
    }
  }
  
  // ─── 429 ─────────────────────────────────────────────────────────────────────
  
  export class RateLimitError extends ApiError {
    constructor(public readonly retryAfter?: number) {
      super(
        "Trop de requêtes. Veuillez réessayer dans un moment.",
        429,
        "RATE_LIMITED"
      )
      this.name = "RateLimitError"
    }
  }
  
  // ─── 500 ─────────────────────────────────────────────────────────────────────
  
  export class InternalError extends ApiError {
    constructor(message = "Erreur interne du serveur.") {
      super(message, 500, "INTERNAL_ERROR")
      this.name = "InternalError"
    }
  }
  
  // ─── Error serializer ────────────────────────────────────────────────────────
  
  /**
   * Converts any caught error into a consistent shape for JSON responses.
   * Used by fail() in response.ts.
   */
  export function serializeError(err: unknown): {
    message: string
    code: string
    status: number
    fields?: Record<string, string>
    retryAfter?: number
  } {
    if (err instanceof ValidationError) {
      return {
        message: err.message,
        code: err.code,
        status: err.status,
        fields: err.fields,
      }
    }
  
    if (err instanceof RateLimitError) {
      return {
        message: err.message,
        code: err.code,
        status: err.status,
        retryAfter: err.retryAfter,
      }
    }
  
    if (err instanceof ApiError) {
      return {
        message: err.message,
        code: err.code,
        status: err.status,
      }
    }
  
    // Unknown error — log server-side, never leak internal details to client
    console.error("[API] Unhandled error:", err)
    return {
      message: "Erreur interne du serveur.",
      code: "INTERNAL_ERROR",
      status: 500,
    }
  }