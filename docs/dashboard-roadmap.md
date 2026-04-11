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
| Store switcher dropdown (component; wire into shell when needed) | `src/components/dashboard/shell/store-switcher.tsx` |
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
2. **Products** — Done
   - `src/app/dashboard/products/page.tsx`
   - `src/app/dashboard/products/new/page.tsx`
   - `src/app/dashboard/products/[id]/edit/page.tsx`
   - `src/components/dashboard/products/products-table.tsx`
   - `src/components/dashboard/products/product-form.tsx`
3. **Store settings** — next: store PATCH form, shipping zones list + add/edit.
4. **Create store** — next: `/dashboard/stores/new` form (wires to `POST /api/stores`).

## Phase 3 — Growth features

1. **Analytics** — plan-gated with `has_analytics`; charts via Recharts; wire `GET /api/analytics/*`.
2. **Subscription / profile** — `/api/subscription`, `/api/profile`.

## Phase 4 — i18n + UX hardening

1. **`next-intl`** — `messages/fr.json`, `messages/en.json`; Arabic + RTL deferred.
2. Skeletons on data loads, empty states per `ux-rules.mdc`.

## Dashboard visual system

- **Stripe-inspired shell** (sidebar, top bar, nav states): canonical spec in `docs/stripe/README.md`; Cursor rules in `.cursor/rules/ui-components.mdc`. **shadcn/ui** remains the component base.

## Data layer — current behavior vs target

- **Reads (lists / detail pages):** Server Components query Supabase with `await createClient()`; data is passed as props to client tables. This is the **default** and avoids duplicate client fetches.
- **Writes:** Client components use `apiFetch` to `/api/*` (cookies). Prefer `useMutation` from TanStack Query for shared error/toast/loading patterns.
- **After a successful mutation:**
  - If the updated UI is driven by **RSC props** → `router.refresh()` and/or **local row state** (e.g. order status in the table).
  - If the updated UI is driven by **`useQuery`** → `invalidateQueries` using `src/lib/query-keys.ts`.
  - **`invalidateQueries` alone does nothing** for RSC-only pages if no `useQuery` subscribes to that key.
- **TanStack Query:** use `useQuery` only when you intentionally want a **client cache** (live updates, polling, deduping across islands). Otherwise keep reads on the server.
- **Do not add SWR** — one client cache library (TanStack Query) only.
- **Reference patterns** (external): `quickmanage-merchant-portal` — `ApiClientV1.js` (central HTTP client), `UserProfileContext.jsx` (stable keyed fetch, no refetch on focus) map to `apiFetch` and TanStack Query options respectively; see `.cursor/rules/dashboard-data-fetching.mdc`.

## Conventions (quick reference)

- **Reads**: Server Components + `await createClient()` + Supabase (no `apiFetch`).
- **Writes**: Client `apiFetch` with `credentials: "include"` (default) via `src/lib/api-client.ts`.
- **Active store**: `?store=<uuid>` in URL only — `parseStoreId()` on server, `useStoreSearchParam()` on client.
- **Mutations**: `useMutation` from TanStack Query; on success use **`router.refresh()`** and/or **`invalidateQueries`** only when a matching **`useQuery`** exists — see **Data layer** above.
