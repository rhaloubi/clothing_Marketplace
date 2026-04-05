import { redirectToLogin } from "@/lib/auth/redirect-to-login"

/**
 * Browser-side fetch helper for internal `/api/*` routes.
 *
 * Security notes:
 * - Always sends cookies (`credentials: "include"`) so Supabase session reaches the API.
 * - Do not read or write auth tokens in localStorage for session — Supabase SSR uses cookies.
 * - On 401, optionally redirects to `/login` (same as middleware) for expired sessions.
 *
 * Do not import this file in Server Components — use `createClient()` + Supabase instead.
 */

/** JSON body shape returned by `ok()` / `fail()` in `@/lib/api/response` */
export type ApiJsonError = {
  message: string
  code: string
  fields?: Record<string, string>
  retryAfter?: number
}

export type ApiJsonSuccess<T> = { data: T; error: null }
export type ApiJsonFailure = { data: null; error: ApiJsonError }
export type ApiJsonEnvelope<T> = ApiJsonSuccess<T> | ApiJsonFailure

/**
 * Thrown when an `/api/*` call returns an error envelope or non-OK HTTP status.
 * Distinct from server-side `ApiError` in `@/lib/api/errors` (route handlers only).
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly fields?: Record<string, string>,
    public readonly retryAfter?: number
  ) {
    super(message)
    this.name = "ApiClientError"
  }
}

export type ApiFetchOptions = RequestInit & {
  /** @default "include" — required for dashboard mutations */
  credentials?: RequestInit["credentials"]
  /**
   * When true, `UNAUTHORIZED` (401) triggers a full navigation to `/login?next=...`.
   * Use for mutations; prefer `false` when you handle 401 inline.
   * @default false
   */
  redirectOnUnauthorized?: boolean
}

/**
 * Typed fetch to same-origin `/api/*` routes.
 *
 * @throws ApiClientError on error JSON or HTTP failure
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    redirectOnUnauthorized = false,
    credentials = "include",
    headers: initHeaders,
    ...rest
  } = options

  const headers = new Headers(initHeaders)
  const body = rest.body
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData

  if (body != null && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(path, {
    ...rest,
    credentials,
    headers,
  })

  if (res.status === 204) {
    return undefined as T
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new ApiClientError(
      "Réponse invalide du serveur.",
      "INVALID_RESPONSE",
      res.status
    )
  }

  const envelope = json as Partial<ApiJsonEnvelope<T>>

  if (envelope.error) {
    const err = envelope.error
    if (
      redirectOnUnauthorized &&
      res.status === 401 &&
      err.code === "UNAUTHORIZED"
    ) {
      redirectToLogin(
        `${window.location.pathname}${window.location.search}`
      )
    }
    throw new ApiClientError(
      err.message ?? "Une erreur est survenue",
      err.code ?? "UNKNOWN",
      res.status,
      err.fields,
      err.retryAfter
    )
  }

  if (!res.ok) {
    throw new ApiClientError(
      "Une erreur est survenue",
      "HTTP_ERROR",
      res.status
    )
  }

  if (envelope.data === undefined) {
    throw new ApiClientError(
      "Réponse invalide du serveur.",
      "INVALID_RESPONSE",
      res.status
    )
  }

  return envelope.data as T
}
