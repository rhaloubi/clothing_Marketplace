# API testing guide — step by step

This document walks through creating a merchant account, a store, catalog data (attributes → product → variants), shipping, and exercising public storefront and dashboard endpoints. It matches the routes under `src/app/api/` and the Zod schemas in `src/lib/validations/index.ts`.

## Prerequisites

1. **Environment** — `.env.local` filled per `src/env.js` (Supabase, Redis, WhatsApp, cron/webhook secrets, etc.). For a minimal **dashboard + DB** test you can temporarily use `SKIP_ENV_VALIDATION=true` only if you understand the tradeoffs.
2. **Database** — Run `db/database-schema.sql` then `db/supabase-triggers.sql` in the Supabase SQL editor (profiles, starter subscription, `decrement_stock` RPC).
3. **Types** — After the schema exists: `bun run db:types` so `Database` types match your project.
4. **Dev server** — `bun run dev` (default `http://localhost:3000`).
5. **Response shape** — All JSON APIs use:
  ```json
   { "data": ..., "error": null }
  ```
   or on failure:
6. **OpenAPI / Swagger (dev only)** — With `NODE_ENV=development`:
  - UI: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
  - JSON: [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json)

---

## Authentication (dashboard routes)

Dashboard routes use **Supabase session cookies** (`@supabase/ssr`), not a Bearer token in headers.

**Recommended**

1. Implement or use your app’s `/signup` and `/login` flows (they call Supabase and set cookies).
2. In the browser, log in, then use **Swagger “Try it out”** on `/api-docs` (same origin → cookies sent automatically).

**Alternative (curl / Insomnia)**

- Call Supabase Auth REST directly, then pass the **access token** only works if you add a Bearer-based path — **this repo expects cookies**. For pure API clients, either:
  - automate login in a browser and copy the `sb-<project-ref>-auth-token` cookie, or
  - extend tooling later to accept `Authorization: Bearer <access_token>` (not implemented in the snippets below).

**Cookie header example (manual)**

```http
Cookie: sb-xxxxx-auth-token=base64-encoded-json...
```

Replace with the real cookie name from your Supabase project (see Application → Cookies after login).

---

## Step 0 — Public reference data

### `GET /api/wilayas`

- **Auth:** none  
- **Query:** none  
- **Returns:** list of Moroccan wilayas (cached).

```bash
curl -s http://localhost:3000/api/wilayas
```

---

## Step 1 — List stores (after login)

### `GET /api/stores`

- **Auth:** required  
- **Returns:** your stores.

```bash
curl -s -b "$COOKIE" http://localhost:3000/api/stores
```

---

## Step 2 — Create a store

### `POST /api/stores`

- **Auth:** required  
- **Body (JSON):**


| Field             | Type   | Required | Notes                              |
| ----------------- | ------ | -------- | ---------------------------------- |
| `name`            | string | yes      | 2–60 chars                         |
| `slug`            | string | yes      | 3–50 chars, `^[a-z0-9-]+$`         |
| `description`     | string | no       | max 500                            |
| `whatsapp_number` | string | no       | `+` optional, 9–15 digits, or `""` |


```json
{
  "name": "Test Boutique",
  "slug": "testboutique",
  "description": "Démo",
  "whatsapp_number": "+212612345678"
}
```

Save the returned store `id` as `STORE_ID` and `slug` as `TENANT_SLUG` for later steps.

---

## Step 3 — Store detail & settings

### `GET /api/stores/{id}`

- **Auth:** required, must own store.

### `PATCH /api/stores/{id}`

- **Body:** partial `updateStoreSchema` — optional fields include `name`, `description`, `whatsapp_number`, `theme` (`minimal`  `bold`  `elegant`), `theme_config`, `is_active`, `logo_url`, `banner_url`, `meta_title`, `meta_description`, etc.  
- **Note:** slug is **not** updatable here.

### `DELETE /api/stores/{id}`

- **Auth:** required.  
- **Behavior:** fails with **409** if orders exist (`ON DELETE RESTRICT`). Prefer `PATCH` with `is_active: false` to deactivate.

---

## Step 4 — Shipping zones

### `GET /api/stores/{id}/shipping-zones`

- **Auth:** required.

### `POST /api/stores/{id}/shipping-zones`


| Field                     | Type          | Required | Notes                                     |
| ------------------------- | ------------- | -------- | ----------------------------------------- |
| `wilaya_id`               | number        | yes      | 1–12                                      |
| `price_mad`               | number        | yes      | integer ≥ 0                               |
| `provider_id`             | uuid | null   | no       | must exist in `shipping_providers` if set |
| `free_shipping_threshold` | number | null | no       | integer ≥ 0                               |
| `estimated_days_min`      | number        | no       | default 2, ≥ 1                            |
| `estimated_days_max`      | number        | no       | default 5, ≥ min                          |
| `is_active`               | boolean       | no       | default true                              |


Duplicate `(store_id, wilaya_id)` → **409**.

### `PATCH /api/stores/{id}/shipping-zones/{zoneId}`

- **Body:** partial shipping zone fields (`updateShippingZoneSchema`).

### `DELETE /api/stores/{id}/shipping-zones/{zoneId}`

---

## Step 5 — Attributes (EAV) before variants

Variants must reference **attribute value UUIDs** from your store.

### `GET /api/attributes?store_id={STORE_ID}`

### `POST /api/attributes`


| Field          | Type    | Required                                                  |
| -------------- | ------- | --------------------------------------------------------- |
| `store_id`     | uuid    | yes                                                       |
| `name`         | string  | yes, 1–50 chars                                           |
| `display_type` | enum    | no — `select` (default), `color_swatch`, `text`, `button` |
| `is_required`  | boolean | no                                                        |
| `sort_order`   | number  | no                                                        |
| `values`       | array   | yes, min 1 item                                           |


Each value object:


| Field        | Type      | Required |
| ------------ | --------- | -------- |
| `label`      | string    | yes      |
| `value`      | string    | yes      |
| `color_hex`  | `#RRGGBB` | no       |
| `sort_order` | number    | no       |


**Example**

```json
{
  "store_id": "STORE_UUID",
  "name": "Taille",
  "display_type": "select",
  "values": [
    { "label": "M", "value": "m", "sort_order": 0 },
    { "label": "L", "value": "l", "sort_order": 1 }
  ]
}
```

Repeat for **Couleur** (or a single attribute if you only need one dimension).  
From the response, note `**attribute_values[].id`** — you need at least one UUID per variant.

---

## Step 6 — Create a product

### `GET /api/products?store_id={STORE_ID}&limit=50&offset=0`

### `POST /api/products`


| Field              | Type          | Required | Notes                           |
| ------------------ | ------------- | -------- | ------------------------------- |
| `store_id`         | uuid          | yes      |                                 |
| `name`             | string        | yes      | 2–200 chars                     |
| `base_price`       | number        | yes      | integer MAD, 1–100000           |
| `images`           | string[]      | yes      | min 1, max 10, each a valid URL |
| `description`      | string        | no       | max 2000                        |
| `category`         | string        | no       | max 100                         |
| `compare_price`    | number | null | no       | if set, must be > `base_price`  |
| `is_active`        | boolean       | no       | default true                    |
| `is_featured`      | boolean       | no       | default false                   |
| `slug`             | string        | no       | auto if omitted                 |
| `meta_title`       | string        | no       | max 60                          |
| `meta_description` | string        | no       | max 160                         |


```json
{
  "store_id": "STORE_UUID",
  "name": "T-shirt coton",
  "base_price": 149,
  "images": ["https://example.com/tshirt.jpg"]
}
```

Save `PRODUCT_ID` from the response.

### `GET /api/products/{id}` · `PATCH /api/products/{id}` · `DELETE /api/products/{id}`

- **PATCH** uses `updateProductSchema` (partial; slug optional with pattern).

---

## Step 7 — Variants

### `GET /api/products/{id}/variants`

### `POST /api/products/{id}/variants`


| Field                 | Type     | Required | Notes                                              |
| --------------------- | -------- | -------- | -------------------------------------------------- |
| `sku`                 | string   | no       | max 100                                            |
| `price_override`      | number   | no       | integer ≥ 1 if set                                 |
| `stock_quantity`      | number   | no       | default 0                                          |
| `images`              | string[] | no       | max 5 URLs                                         |
| `is_active`           | boolean  | no       | default true                                       |
| `attribute_value_ids` | uuid[]   | yes      | min 1; all must belong to this store’s definitions |


**Example** (one value from “Taille”, one from “Couleur”):

```json
{
  "stock_quantity": 10,
  "attribute_value_ids": ["VALUE_UUID_TAILLE_M", "VALUE_UUID_COULEUR_ROUGE"]
}
```

### `PATCH` / `DELETE` — `/api/products/{id}/variants/{variantId}`

---

## Step 8 — Orders (merchant dashboard)

### `GET /api/orders?store_id={STORE_ID}&limit=50&offset=0`

- Optional query: `status` = `pending`  `confirmed`  `shipped`  `delivered`  `returned`  `cancelled`

### `GET /api/orders/{order_id}`

### `PATCH /api/orders/{order_id}`

At least one of:


| Field                  | Type          | Notes                                      |
| ---------------------- | ------------- | ------------------------------------------ |
| `status`               | enum          | COD state machine (no skip / no backwards) |
| `tracking_number`      | string | null | max 100                                    |
| `shipping_provider_id` | uuid | null   |                                            |


If `status` equals current status, only tracking fields may change.

---

## Step 9 — Analytics

### `POST /api/analytics/events` (public, rate limit `analytics`)


| Field               | Type                            | Required        |
| ------------------- | ------------------------------- | --------------- |
| `store_id`          | uuid                            | yes             |
| `event_type`        | enum                            | yes — see below |
| `product_id`        | uuid                            | no              |
| `order_id`          | uuid                            | no              |
| `session_id`        | string                          | no              |
| `wilaya_id`         | 1–12                            | no              |
| `referrer`, `utm_*` | string                          | no              |
| `device_type`       | `mobile` | `tablet` | `desktop` | no              |


**event_type:** `page_view`, `product_view`, `cart_add`, `cart_remove`, `checkout_start`, `checkout_abandon`, `order_placed`, `order_delivered`, `order_returned`

### Query routes (auth + **Growth plan** `has_analytics`)

All use query params:


| Param      | Required                                              |
| ---------- | ----------------------------------------------------- |
| `store_id` | yes (uuid)                                            |
| `from`     | no (ISO datetime with offset; default ≈ last 30 days) |
| `to`       | no (ISO datetime with offset; default now)            |


Endpoints:

- `GET /api/analytics/overview`
- `GET /api/analytics/revenue`
- `GET /api/analytics/funnel`
- `GET /api/analytics/products`
- `GET /api/analytics/wilayas`

**Starter plan** → expect **403**-style plan upgrade response for these GET routes.

---

## Step 10 — Storefront (public, `tenant` = store **slug**)

### `GET /api/storefront/{tenant}/products?limit=24&offset=0`

### `GET /api/storefront/{tenant}/products/{slug}`

- `slug` = product slug, not UUID.

### `GET /api/storefront/{tenant}/shipping?wilaya_id=1`

- Returns shipping zone info if configured.

### `POST /api/storefront/{tenant}/orders` (rate limit `checkout`)

Body = `storefrontCheckoutSchema` = `checkoutSchema` + `items`:

**Customer / address**


| Field              | Type   | Notes                             |
| ------------------ | ------ | --------------------------------- |
| `customer_name`    | string | 2–100                             |
| `customer_phone`   | string | Moroccan `+212` or `0` + 9 digits |
| `customer_address` | string | 10–300                            |
| `customer_city`    | string | 2–100                             |
| `wilaya_id`        | number | 1–12                              |
| `customer_notes`   | string | optional, max 500                 |


**items** (min 1)


| Field        | Type   | Notes |
| ------------ | ------ | ----- |
| `variant_id` | uuid   |       |
| `quantity`   | number | 1–99  |


Requires an active **shipping zone** for that `wilaya_id`. Stock is decremented via `decrement_stock` on success.

---

## Step 11 — Upload (signed URL)

### `POST /api/upload` (auth, rate limit `upload`)


| Field          | Type   | Notes                                                  |
| -------------- | ------ | ------------------------------------------------------ |
| `store_id`     | uuid   | must own store                                         |
| `bucket`       | enum   | `store-assets` | `product-images`                      |
| `path`         | string | relative path; server prefixes `{user_id}/{store_id}/` |
| `content_type` | string | for client PUT metadata                                |


Response includes `signed_url` and `token` for Supabase Storage client upload.

---

## Step 12 — Webhooks & cron (integration tests)


| Endpoint                           | Notes                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `GET /api/webhooks/whatsapp`       | Meta `hub.verify_token` / `hub.challenge`                                            |
| `POST /api/webhooks/whatsapp`      | `X-Hub-Signature-256` using `WHATSAPP_APP_SECRET`                                    |
| `POST /api/webhooks/delivery`      | `X-Signature-256` using `DELIVERY_WEBHOOK_SECRET`; JSON `deliveryStatusUpdateSchema` |
| `GET /api/cron/subscription-check` | `Authorization: Bearer <CRON_SECRET>`                                                |


Use real secrets and canonical JSON bodies when testing signatures.

---

## Suggested happy-path checklist

1. [ ] `GET /api/wilayas`
2. [ ] Log in (browser) → `GET /api/stores`
3. [ ] `POST /api/stores` → save `STORE_ID`, `TENANT_SLUG`
4. [ ] `POST /api/stores/{id}/shipping-zones` for at least one `wilaya_id`
5. [ ] `POST /api/attributes` (e.g. Taille + Couleur) → collect `attribute_values[].id`
6. [ ] `POST /api/products` → `PRODUCT_ID`
7. [ ] `POST /api/products/{id}/variants` → `VARIANT_ID`
8. [ ] `GET /api/storefront/{TENANT_SLUG}/products` and `.../products/{product-slug}`
9. [ ] `POST /api/storefront/{TENANT_SLUG}/orders` with `items: [{ variant_id, quantity }]`
10. [ ] `GET /api/orders?store_id=...` → `PATCH /api/orders/{id}` (`pending` → `confirmed`, etc.)
11. [ ] (Growth) analytics GET routes with `store_id` + date range
12. [ ] (Optional) `POST /api/upload` then use returned signed URL

---

## Troubleshooting


| Symptom                              | Likely cause                                            |
| ------------------------------------ | ------------------------------------------------------- |
| 401 on dashboard routes              | Missing or expired Supabase session cookie              |
| 403 on analytics GET                 | Plan without `has_analytics`                            |
| 409 on shipping zone POST            | Duplicate `wilaya_id` for that store                    |
| 400 on variant POST                  | `attribute_value_ids` not on this store / invalid UUIDs |
| 404 on storefront                    | Wrong tenant slug or store `is_active: false`           |
| Checkout 409 / stock error           | `decrement_stock` failed (insufficient stock)           |
| Types feel wrong / `never` on tables | Run `bun run db:types` after applying SQL schema        |


For exhaustive path documentation in development, prefer `**/api-docs`** and `**/api/openapi.json**` over duplicating every field here.