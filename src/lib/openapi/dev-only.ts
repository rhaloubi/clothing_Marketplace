/**
 * OpenAPI + Swagger UI are exposed only when NODE_ENV === "development".
 * Production and `next start` builds return 404 for /api-docs and /api/openapi.json.
 */
export function isOpenApiDevEnabled(): boolean {
  return process.env.NODE_ENV === "development"
}
