# Merchant dashboard — implementation roadmap

Order follows foundation first (fetch, auth behavior, routing), then data surfaces, then polish.

## Phase 0 — Done (this pass)


| Item                                    | Location                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Typed API client + `ApiClientError`     | `[src/lib/api-client.ts](../src/lib/api-client.ts)`                                       |
| Login redirect helper (expired session) | `[src/lib/auth/redirect-to-login.ts](../src/lib/auth/redirect-to-login.ts)`               |
| `store` query param parsing (UUID)      | `[src/lib/dashboard/search-params.ts](../src/lib/dashboard/search-params.ts)`             |
| TanStack Query keys                     | `[src/lib/query-keys.ts](../src/lib/query-keys.ts)`                                       |
| Query provider + devtools (dev only)    | `[src/components/shared/query-provider.tsx](../src/components/shared/query-provider.tsx)` |
| `useStoreSearchParam` hook              | `[src/hooks/use-store-search-param.ts](../src/hooks/use-store-search-param.ts)`           |
| `(dashboard)` layout + placeholder home | `[src/app/(dashboard)/](../src/app/(dashboard)`/)                                         |


## Phase 1 — Auth pages + navigation shell

1. `**/login` and `/signup` pages** (middleware already references them; currently missing).
2. **Dashboard chrome**: sidebar / header (mobile Sheet), nav links **always** preserving `?store=`.
3. **Store picker**: if `store` missing, list user’s stores (Server Component + Supabase) and set URL or redirect to first store.
4. `**apiFetch` usage in mutations**: e.g. patch order status with `invalidateQueries` + `queryKeys`.

## Phase 2 — Core CRUD surfaces

1. **Orders** — list (RSC) + table client mutations (status) + detail.
2. **Products** — list, create/edit forms (`react-hook-form` + `@/lib/validations` + `apiFetch`).
3. **Store settings** — store PATCH, shipping zones.

## Phase 3 — Growth features

1. **Analytics** (plan-gated UI mirroring `withPlan("has_analytics")`).
2. **Subscription / profile** — wire to existing `/api/subscription`, `/api/profile`.

## Phase 4 — i18n + UX hardening

1. `**next-intl`**: `messages/fr.json`, `messages/en.json`; Arabic + RTL later per rules.
2. Toasts (Sonner), skeletons, empty states per `ux-rules.mdc`.

## Conventions (quick reference)

- **Reads**: Server Components + `await createClient()` + Supabase (no `apiFetch`).
- **Writes**: Client `apiFetch` / `fetch` with `credentials: "include"`.
- **Active store**: `?store=<uuid>` only — see `[useStoreSearchParam](../src/hooks/use-store-search-param.ts)`.

