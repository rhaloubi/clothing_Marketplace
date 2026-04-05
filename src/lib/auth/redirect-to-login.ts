/**
 * Client-only full-page navigation to `/login`.
 * Middleware already protects `/dashboard`; this handles expired sessions after API calls.
 */
export function redirectToLogin(nextPath?: string): void {
  if (typeof window === "undefined") return
  const url = new URL("/login", window.location.origin)
  if (nextPath) url.searchParams.set("next", nextPath)
  window.location.assign(url.toString())
}
