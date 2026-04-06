# Merchant dashboard — implementation roadmap

Order follows foundation first (fetch, auth behavior, routing), then data surfaces, then polish.

## Phase 0 — Done

| Item | Location |
|------|----------|
| Typed API client + `ApiClientError` | `src/lib/api-client.ts` |
| Login redirect helper (expired session) | `src/lib/auth/redirect-to-login.ts` |
| `store` query param parsing (UUID) | `src/lib/dashboard/search-params.ts` |
| TanStack Query keys | `src/lib/query-keys.ts` |
| Query provider + devtools (dev only) | `src/components/shared/query-provider.tsx` |
| `useStoreSearchParam` hook | `src/hooks/use-store-search-param.ts` |

## Phase 1 — Done

| Item | Location |
|------|----------|
| `/login` page + `LoginForm` (RHF + `apiFetch`) | `src/app/(auth)/login/` |
| `/signup` page + `SignupForm` (RHF + `apiFetch`) | `src/app/(auth)/signup/` |
| Dashboard shell (sidebar + mobile Sheet header) | `src/components/dashboard/shell/dashboard-shell.tsx` |
| Nav links preserving `?store=` | `src/components/dashboard/shell/nav-links.tsx` |
| Store switcher dropdown | `src/components/dashboard/shell/store-switcher.tsx` |
| User menu (logout → /login) | `src/components/dashboard/shell/user-menu.tsx` |
| Dashboard layout: auth guard + stores + shell | `src/app/dashboard/layout.tsx` |
| Dashboard home: auto-redirect / empty state | `src/app/dashboard/page.tsx` |
| `usePatchOrderStatus` mutation hook | `src/hooks/use-patch-order-status.ts` |
| shadcn/ui init + all UI components | `src/components/ui/` |

**Note — @base-ui:** shadcn Nova preset uses `@base-ui`, not Radix.
No `asChild` prop exists. Style triggers directly with `buttonVariants` className.

## Phase 2 — Core CRUD surfaces (in progress)

1. **Orders** — Done
   - `src/app/dashboard/orders/page.tsx`
   - `src/app/dashboard/orders/[id]/page.tsx`
   - `src/components/dashboard/orders/orders-table.tsx`
   - `src/components/dashboard/orders/order-status-select.tsx`
2. **Products** — next: list, create form (`react-hook-form` + `createProductSchema` + `apiFetch POST /api/products`), edit form.
3. **Store settings** — next: store PATCH form, shipping zones list + add/edit.
4. **Create store** — next: `/dashboard/stores/new` form (wires to `POST /api/stores`).

## Phase 3 — Growth features

1. **Analytics** — plan-gated with `has_analytics`; charts via Recharts; wire `GET /api/analytics/*`.
2. **Subscription / profile** — `/api/subscription`, `/api/profile`.

## Phase 4 — i18n + UX hardening

1. **`next-intl`** — `messages/fr.json`, `messages/en.json`; Arabic + RTL deferred.
2. Skeletons on data loads, empty states per `ux-rules.mdc`.

## Conventions (quick reference)

- **Reads**: Server Components + `await createClient()` + Supabase (no `apiFetch`).
- **Writes**: Client `apiFetch` with `credentials: "include"` (default) via `src/lib/api-client.ts`.
- **Active store**: `?store=<uuid>` in URL only — `parseStoreId()` on server, `useStoreSearchParam()` on client.
- **Mutations**: `useMutation` from TanStack Query, invalidate via `queryKeys.*` on success.
