# ++Shri Marketplace — Platform Overview++

++**Date:** 2026-03-28++  
++**Stack:** Next.js 15 · Supabase · Upstash Redis · WhatsApp Cloud API · Vercel (++`lhr1`++)++

---

## ++Table of Contents++

1. ++[What This Platform Is](#1-what-this-platform-is)++
2. ++[Architecture at a Glance](#2-architecture-at-a-glance)++
3. ++[Multi-Tenancy and Routing](#3-multi-tenancy-and-routing)++
4. ++[Security Layer](#4-security-layer)++
5. ++[Dashboard API — Merchant Endpoints](#5-dashboard-api--merchant-endpoints)++
6. ++[Storefront API — Public Endpoints](#6-storefront-api--public-endpoints)++
7. ++[Webhooks](#7-webhooks)++
8. ++[WhatsApp Integration](#8-whatsapp-integration)++
9. ++[Cron Jobs](#9-cron-jobs)++
10. ++[Subscription Plans and Feature Gates](#10-subscription-plans-and-feature-gates)++
11. ++[Order State Machine](#11-order-state-machine)++
12. ++[Analytics](#12-analytics)++
13. ++[Data Design Decisions](#13-data-design-decisions)++
14. ++[Performance Optimizations Applied](#14-performance-optimizations-applied)++
15. ++[What Is Done vs What Comes Next](#15-what-is-done-vs-what-comes-next)++

---

## ++1. What This Platform Is++

++A multi-tenant SaaS for Moroccan clothing merchants. Each merchant signs up, creates a store, and gets a public storefront at++ `{slug}.platform.ma`++. Customers browse and buy via cash-on-delivery (COD) — no payment gateway. Merchants pay a monthly subscription (99–499 MAD).++

++**Key business constraints:**++

- ++Morocco only — 12 wilayas, MAD prices as integers, phone numbers in++ `+212` ++format++
- ++COD only — no Stripe, no CMI yet++
- ++Customers never create accounts — guest checkout (name + phone + wilaya)++
- ++WhatsApp is the primary notification channel (email is secondary)++

---

## ++2. Architecture at a Glance++

```
Browser / Mobile
       │
       ▼
Vercel Edge (lhr1 — London)
       │
  middleware.ts  ──► subdomain routing: mystore.platform.ma → /[tenant]/...
       │
  Next.js App Router
  ├── (auth)/          login · signup
  ├── (dashboard)/     merchant UI (server + client components)
  ├── (storefront)/    public storefronts (SSR for SEO)
  └── api/             JSON REST API
           │
           ├── Supabase PostgreSQL  (RLS-enforced, eu-west-1 Dublin)
           ├── Supabase Storage     (signed uploads, public CDN)
           ├── Upstash Redis        (rate limiting + plan cache, 60 s TTL)
           └── WhatsApp Cloud API   (Meta Business)
```

++Everything is in one Next.js monorepo. No Docker, no separate service.++

---

## ++3. Multi-Tenancy and Routing++

++Every store lives on a subdomain:++ `mystore.platform.ma`++.++

```
Request: mystore.platform.ma/products/shirt
  ↓
middleware.ts reads hostname → extracts "mystore"
  ↓
Rewrites internally to: /mystore/products/shirt
  ↓
Served by: src/app/(storefront)/[tenant]/products/[slug]/page.tsx
  ↓
Browser URL stays: mystore.platform.ma/products/shirt
```

++Tenant isolation in the database is enforced by Supabase Row Level Security (RLS) — every table has++ `store_id` ++or++ `user_id`++. Application code does **not** manually filter by user; RLS does it automatically.++

---

## ++4. Security Layer++

++All API routes use composable wrappers from++ `src/lib/api/`++.++

### ++Wrappers++


| ++Wrapper++             | ++Purpose++                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `withUserAuth`          | ++Verifies Supabase session cookie → injects++ `auth.user.id`                                         |
| `withAuth`              | ++Like++ `withUserAuth` +++ also loads the++ `profiles` ++row (used where profile is needed)++        |
| `withPlan(feature?)`    | ++Loads subscription + plan from Redis (60 s cache) or Supabase; optionally gates on a feature flag++ |
| `withRateLimit(preset)` | ++Sliding-window rate limit via Upstash Redis; keyed by IP or user ID++                               |
| `withWebhook(type)`     | ++Verifies HMAC signature (++`X-Hub-Signature-256`++) for++ `whatsapp`++,++ `delivery`++, or++ `cron` |


### ++Rate limit presets++


| ++Preset++  | ++Limit++                  | ++Used for++                                     |
| ----------- | -------------------------- | ------------------------------------------------ |
| `auth`      | ++10 req/min++             | ++Login, signup++                                |
| `checkout`  | ++20 req/min++             | ++Guest order placement++                        |
| `analytics` | ++120 req/min++            | ++Storefront event tracking++                    |
| `api`       | ++bypassed (intentional)++ | ++Authenticated dashboard GETs — trusted users++ |
| `write`     | ++60 req/min++             | ++All mutations (POST/PATCH/DELETE)++            |
| `public`    | ++120 req/min++            | ++Storefront reads++                             |
| `upload`    | ++30 req/min++             | ++Signed upload URL requests++                   |
| `webhook`   | ++500 req/min++            | ++Delivery provider callbacks++                  |


### ++Response helpers++

++All routes use++ `ok()`++,++ `created()`++,++ `noContent()`++,++ `fail()` ++— never raw++ `NextResponse.json()`++.++ `fail()` ++accepts any typed error class and maps it to the correct HTTP status.++

---

## ++5. Dashboard API — Merchant Endpoints++

++All dashboard routes require authentication (++`withUserAuth` ++or++ `withAuth`++). Ownership of every resource is enforced both by RLS and by a merged query filter (++`.eq("user_id", auth.user.id)` ++or a++ `stores!inner` ++join).++

---

### ++Stores —++ `GET /api/stores`

++Lists all stores belonging to the authenticated merchant. Returns an array ordered by++ `created_at`++.++

### ++Stores —++ `POST /api/stores`

++Creates a new store. Requires plan-gated check (++`withPlan()`++) — enforces++ `max_stores` ++for the merchant's current plan. Validates name (2–60 chars), slug (lowercase alphanumeric + hyphens, unique), optional description and WhatsApp number. Returns++ `201` ++with the created store.++

### ++Store detail —++ `GET /api/stores/[id]`

++Returns the full store row if the authenticated user owns it.++

### ++Store update —++ `PATCH /api/stores/[id]`

++Partial update: name, description, WhatsApp number, theme, custom domain, logo/banner URLs, SEO meta,++ `is_active`++. Empty patch returns the current row unchanged.++

### ++Store delete —++ `DELETE /api/stores/[id]`

++Deletes the store. Returns++ `409` ++if orders are linked (foreign key constraint) with a French message suggesting deactivation instead.++

---

### ++Shipping zones —++ `GET /api/stores/[id]/shipping-zones`

++Lists all shipping zones for the store with nested wilaya data, ordered by++ `wilaya_id`++.++

### ++Shipping zones —++ `POST /api/stores/[id]/shipping-zones`

++Creates a zone for a specific wilaya. Fields:++ `wilaya_id`++, optional++ `provider_id`++,++ `price_mad`++, optional++ `free_shipping_threshold`++,++ `estimated_days_min/max`++,++ `is_active`++. Returns++ `409` ++if a zone already exists for that wilaya.++

### ++Zone update —++ `PATCH /api/stores/[id]/shipping-zones/[zoneId]`

++Partial update of a shipping zone. Ownership is verified in a single join query (zone → store → user).++

### ++Zone delete —++ `DELETE /api/stores/[id]/shipping-zones/[zoneId]`

++Deletes the zone. Same single-query ownership check.++

---

### ++Products —++ `GET /api/products?store_id=&limit=&offset=`

++Paginated product list for an owned store. Returns++ `products` ++array +++ `total` ++count.++

### ++Products —++ `POST /api/products`

++Creates a product. Requires++ `withPlan()` ++— enforces++ `max_products` ++(counts active products). Auto-generates a slug from the name. Returns++ `201`++.++

### ++Product detail —++ `GET /api/products/[id]`

++Returns the full product with all variants via++ `fetchProductWithVariants`++.++

### ++Product update —++ `PATCH /api/products/[id]`

++Partial update: name, description, category, prices, images, slug,++ `is_active`++,++ `is_featured`++, SEO fields. Conflict on duplicate slug.++

### ++Product delete —++ `DELETE /api/products/[id]`

++Deletes the product (cascades to variants and attribute links per DB schema).++

---

### ++Variants —++ `GET /api/products/[id]/variants`

++Lists all variants for an owned product, ordered by++ `created_at`++.++

### ++Variants —++ `POST /api/products/[id]/variants`

++Creates a variant with fields:++ `sku`++,++ `price_override`++,++ `stock_quantity`++,++ `images`++,++ `is_active`++, and++ `attribute_value_ids`++. Validates that all referenced attribute values belong to the same store. Creates++ `variant_attribute_values` ++links. Rolls back the variant row if the link insert fails. Returns++ `201`++.++

### ++Variant detail/update/delete —++ `GET/PATCH/DELETE /api/products/[id]/variants/[variantId]`

- ++**GET**: single variant row with ownership check++
- ++**PATCH**: updates variant fields; can replace attribute value links entirely++
- ++**DELETE**: deletes variant++

---

### ++Attributes (EAV) —++ `GET /api/attributes?store_id=`

++Lists all attribute definitions with nested values for a store.++

### ++Attributes —++ `POST /api/attributes`

++Creates an attribute definition (name,++ `display_type`++,++ `is_required`++,++ `sort_order`++) with optional initial values array. Rolls back definition if value insert fails. Returns++ `201`++.++

### ++Attribute detail —++ `GET /api/attributes/[id]`

++Returns the definition + all its values.++

### ++Attribute update —++ `PATCH /api/attributes/[id]`

++Updates definition metadata (name, display type, required, sort order).++

### ++Attribute delete —++ `DELETE /api/attributes/[id]`

++Deletes the definition (cascades to values per DB schema).++

### ++Attribute value —++ `POST /api/attributes/[id]/values`

++Adds a value to an existing attribute definition. Conflict on duplicate value code.++

### ++Attribute value —++ `PATCH /api/attributes/[id]/values/[valueId]`

++Updates a value (label, code, etc.). Conflict on duplicate code.++

### ++Attribute value —++ `DELETE /api/attributes/[id]/values/[valueId]`

++Deletes a value. Blocked if the value is linked to any variant (++`variant_attribute_values` ++FK).++

---

### ++Orders list —++ `GET /api/orders?store_id=&status=&limit=&offset=`

++Paginated order list for an owned store. Optional++ `status` ++filter. Returns orders with nested++ `wilayas` ++and++ `order_items`++.++

### ++Order detail —++ `GET /api/orders/[id]`

++Full order with++ `wilayas`++,++ `order_items`++. Ownership verified via++ `assertStoreOwnership`++.++

### ++Order status —++ `PATCH /api/orders/[id]`

++Updates order status, optional tracking number, optional shipping provider. Status changes are validated against the COD state machine. Sets the corresponding timestamp column (++`confirmed_at`++,++ `shipped_at`++, etc.). On++ `confirmed` ++or++ `shipped`++, optionally sends a WhatsApp message to the customer (Growth+ stores only).++

---

### ++Profile —++ `GET /api/profile`

++Returns the authenticated merchant's++ `profiles` ++row.++

### ++Profile —++ `PATCH /api/profile`

++Partial update:++ `full_name` ++(min 2 chars),++ `phone` ++(Moroccan format or null to clear),++ `avatar_url` ++(HTTPS URL or null to clear). At least one field required. Uses the RLS-backed server client —++ `profiles_update_own` ++policy covers this.++

---

### ++Subscription —++ `GET /api/subscription`

++Returns the merchant's current subscription row with the embedded++ `plans` ++row.++

### ++Subscription —++ `PATCH /api/subscription`

++Changes the merchant's plan. Body:++ `{ plan_name: "starter" | "growth" | "pro" }`++.++

- ++Returns++ `200` ++unchanged if already on the requested plan (idempotent)++
- ++For downgrades: runs++ `assertDowngradeSafe` ++— counts active stores vs++ `target.max_stores`++, counts active products vs++ `target.max_products`++; returns++ `409` ++with a French message if limits are exceeded++
- ++Upgrades allowed even from++ `expired` ++status (reactivation)++
- ++Writes via++ `createAdminClient()` ++(merchants have no UPDATE RLS on subscriptions)++
- ++Resets billing window to++ `now + 30 days` ++(billing stub — CMI will replace this)++
- ++Calls++ `invalidatePlanCache(userId)` ++→ DELs the Redis key so the next plan-gated route loads fresh++

---

### ++Upload —++ `POST /api/upload`

++Returns a Supabase signed upload URL. Body:++ `{ file_path, content_type }`++. Path must follow++ `{userId}/{storeId}/...`++. The merchant's ownership of++ `storeId` ++is verified before issuing the URL. Actual file upload goes directly to Supabase Storage from the browser using this URL.++

---

### ++Wilayas —++ `GET /api/wilayas`

++Public endpoint. Returns all 12 Moroccan wilayas. Cached with++ `s-maxage=3600, stale-while-revalidate=86400`++. No auth required.++

---

### ++Analytics (Growth+ only)++

++All analytics routes require++ `withPlan("has_analytics")`++. They accept++ `?store_id=&from=&to=` ++query params (date range parsed by++ `parseAnalyticsRangeQuery`++).++


| ++Route++                     | ++Returns++                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /api/analytics/overview` | ++Event counts by type + total orders + revenue in the date range++                                  |
| `GET /api/analytics/revenue`  | ++Daily revenue and order count series++                                                             |
| `GET /api/analytics/funnel`   | ++Counts and conversion rates: page_view → product_view → cart_add → checkout_start → order_placed++ |
| `GET /api/analytics/products` | ++Top 20 products by revenue (revenue-eligible orders only)++                                        |
| `GET /api/analytics/wilayas`  | ++Per-wilaya order count, revenue, and event type breakdown++                                        |


++Revenue counts only statuses:++ `confirmed`++,++ `shipped`++,++ `delivered` ++(not++ `pending`++,++ `cancelled`++,++ `returned`++).++

---

## ++6. Storefront API — Public Endpoints++

++These routes are called by the storefront UI (or directly by buyers). No authentication. Rate-limited at++ `public` ++(120 req/min by IP).++

### `GET /api/storefront/[tenant]/products`

++Returns a paginated product list for the active store identified by++ `tenant` ++(store slug). Query params:++ `limit` ++(1–100, default 24),++ `offset` ++(default 0). Returns++ `store` ++summary +++ `products` ++array +++ `meta: { total, limit, offset }`++. Returns++ `404` ++if the store is inactive or doesn't exist.++

### `GET /api/storefront/[tenant]/products/[slug]`

++Returns a single product with all its variants and attribute values. Returns++ `404` ++if product not found.++

### `GET /api/storefront/[tenant]/shipping?wilaya_id=`

++Returns the shipping price, free-shipping threshold, estimated delivery days, and provider for a specific wilaya.++ `wilaya_id` ++must be 1–12. Returns++ `404` ++if no zone is configured for that wilaya.++

### `POST /api/storefront/[tenant]/orders`

++Guest checkout. Rate-limited at++ `checkout` ++(20 req/min).++

++**Request body:**++

```json
{
  "customer_name": "Mohamed Alami",
  "customer_phone": "0661234567",
  "customer_address": "Lot Al Fath, Appt 3",
  "customer_city": "Casablanca",
  "wilaya_id": 1,
  "customer_notes": "Appelle avant livraison",
  "items": [
    { "variant_id": "uuid", "quantity": 2 }
  ]
}
```

++**What happens:**++

1. ++Validates body (Zod schema)++
2. ++Merges duplicate variant IDs++
3. ++Resolves active store by tenant slug++
4. ++Verifies shipping zone exists for++ `wilaya_id`
5. ++Loads requested variants with product join; validates all products/variants are active and in stock++
6. ++Builds line snapshots (product name, image, price at order time — **never re-joined later**)++
7. ++Calculates subtotal + shipping (free if subtotal ≥ free-shipping threshold)++
8. ++Via admin client: calls++ `decrement_stock` ++RPC per variant (prevents race conditions)++
9. ++Calls++ `next_store_order_number` ++RPC to get sequential store-scoped order number++
10. ++Inserts++ `orders` ++row then++ `order_items` ++rows (snapshot pattern)++
11. ++If++ `order_items` ++insert fails → deletes the order, restores stock++
12. ++Optionally sends WhatsApp notification to merchant (Growth+ stores only)++
13. ++On any error → restores all decremented stock++

++**Response (201):**++

```json
{
  "order_id": "uuid",
  "order_number": "#1042",
  "total_mad": 350,
  "subtotal_mad": 300,
  "shipping_cost_mad": 50
}
```

### `POST /api/analytics/events`

++Public event ingestion. No auth. Rate-limited at++ `analytics`++. Stores storefront events (++`page_view`++,++ `product_view`++,++ `cart_add`++,++ `checkout_start`++,++ `order_placed`++) for analytics. Append-only — never updated.++

---

## ++7. Webhooks++

### ++WhatsApp —++ `GET /api/webhooks/whatsapp`

++Meta's webhook verification handshake. When you register the webhook URL in Meta Business, Meta sends a++ `GET` ++with++ `hub.mode=subscribe`++,++ `hub.verify_token`++, and++ `hub.challenge`++. This handler calls++ `verifyWhatsAppWebhook(request)` ++which checks the token against++ `WHATSAPP_WEBHOOK_VERIFY_TOKEN` ++and echoes back the challenge.++

### ++WhatsApp —++ `POST /api/webhooks/whatsapp`

++Receives incoming WhatsApp events from Meta. Protected by HMAC-SHA256 signature verification (++`X-Hub-Signature-256` ++header, signed with++ `WHATSAPP_APP_SECRET`++). The request body is used raw for signature verification before JSON parsing.++

++**Current behavior:**++

1. ++Verifies HMAC signature (returns++ `403` ++on failure)++
2. ++Parses body JSON++
3. ++Validates against++ `whatsappWebhookBodySchema` ++(loose Zod schema with++ `.passthrough()` ++for forward compatibility)++
4. ++Returns a non-PII summary (entry/message/status counts, message types) — no phone numbers or message content logged++
5. ++Always returns++ `200` ++to prevent Meta from retrying++

++**What it does NOT do yet:** act on inbound messages. The parsing infrastructure is in place; the handler needs business logic to react (e.g. a customer replies "confirm" → mark order confirmed).++

---

### ++Delivery webhook —++ `POST /api/webhooks/delivery`

++Receives delivery status updates from shipping partners (Amana, CTM, Barid Al-Maghrib). Protected by++ `DELIVERY_WEBHOOK_SECRET` +++++ `X-Signature-256` ++header.++

++**What it does:**++

1. ++Verifies HMAC signature++
2. ++Validates body:++ `{ order_id, status, tracking_number? }` ++(Zod++ `deliveryStatusUpdateSchema`++)++
3. ++Loads the order using the admin client++
4. ++Applies the COD state machine via++ `assertOrderStatusTransition`
5. ++Updates++ `status`++, optional++ `tracking_number`++, timestamp column,++ `updated_at`
6. ++Returns the updated order++

++This allows shipping partners to push status updates (e.g. "shipped", "delivered") directly to the platform without merchant intervention.++

---

## ++8. WhatsApp Integration++

### ++What exists++

++The integration uses the **Meta WhatsApp Business Cloud API** — the free tier covers 1,000 business-initiated messages/month.++

++**Files:**++

- `src/lib/whatsapp/client.ts` ++—++ `sendWhatsAppText(to, body)`++: sends a plain text message via Cloud API++
- `src/lib/whatsapp/templates.ts` ++— French message template builders (no approval required for plain text)++
- `src/lib/whatsapp/phone.ts` ++—++ `toWhatsAppRecipientDigits(phone)`++: converts++ `+212XXXXXXXXX` ++or++ `06XXXXXXXX` ++→++ `212XXXXXXXXX` ++(the format the API requires)++
- `src/lib/whatsapp/inbound-webhook.ts` ++— Zod schemas +++ `summarizeWhatsAppWebhookBody()` ++for parsing Meta webhook payloads++
- `src/lib/whatsapp/index.ts` ++— re-exports everything++

### ++Outbound messages sent today++


| ++Trigger++                                                          | ++Recipient++ | ++Message++                                          |
| -------------------------------------------------------------------- | ------------- | ---------------------------------------------------- |
| ++New order placed (++`POST /storefront/.../orders`++)++             | ++Merchant++  | ++Order number, total, customer name + phone++       |
| ++Order confirmed (++`PATCH /api/orders/[id]`++, status→confirmed)++ | ++Customer++  | ++Confirmation with store name + order number++      |
| ++Order shipped (++`PATCH /api/orders/[id]`++, status→shipped)++     | ++Customer++  | ++Shipping notification + optional tracking number++ |


++All outbound messages are **Growth+ only** — checked via++ `fetchStoreWhatsAppNotificationContext` ++which loads the store's WhatsApp number and verifies++ `has_whatsapp: true` ++on the plan.++

++WhatsApp errors are **non-fatal** — logged to console but never block the API response. The order still completes if WhatsApp is down or the number is not on Meta's allowed list (test mode restriction).++

### ++Known limitation: Meta test mode++

++In Meta's test mode sandbox, you can only message pre-approved phone numbers. In production (approved business account), you can message any number. The code handles this gracefully — errors are caught and logged with a hint about adding the number to Meta's allowed list.++

### ++Inbound webhook (parsed but not acted on)++

++The++ `POST /api/webhooks/whatsapp` ++handler parses incoming messages but currently just logs a summary and returns++ `200`++. The infrastructure for reading what customers send is in place. See "What Comes Next" below for what to build.++

---

## ++9. Cron Jobs++

### `GET /api/cron/subscription-check`

++Runs on a schedule (configured in Vercel Cron). Protected by++ `Authorization: Bearer {CRON_SECRET}` ++header.++

++**What it does:**++

1. ++Uses admin client (bypasses RLS)++
2. ++Finds all++ `active` ++subscriptions where++ `current_period_end < now()`
3. ++Updates them to++ `status = 'expired'`
4. ++Returns++ `{ expired_count }`

++**Effect:** Once expired,++ `withPlan()` ++wrapper returns++ `401` ++for plan-gated routes until the merchant upgrades. The cron must be configured in++ `vercel.json` ++with a schedule like++ `0 2 * * `* ++(2 AM daily).++

---

## ++10. Subscription Plans and Feature Gates++


| ++Plan++    | ++Price++      | ++Max Stores++ | ++Max Products++ | ++Analytics++ | ++WhatsApp++ | ++Custom Domain++ | ++Staff++ | ++API++ |
| ----------- | -------------- | -------------- | ---------------- | ------------- | ------------ | ----------------- | --------- | ------- |
| ++starter++ | ++99 MAD/mo++  | ++1++          | ++50++           | ++✗++         | ++✗++        | ++✗++             | ++✗++     | ++✗++   |
| ++growth++  | ++249 MAD/mo++ | ++1++          | ++unlimited++    | ++✓++         | ++✓++        | ++✓++             | ++✗++     | ++✗++   |
| ++pro++     | ++499 MAD/mo++ | ++3++          | ++unlimited++    | ++✓++         | ++✓++        | ++✓++             | ++✓++     | ++✓++   |


++Plan enforcement happens in two places:++

1. ++**Route level**:++ `withPlan("has_analytics")` ++wrapper blocks access if the feature isn't on the plan++
2. ++**Insert level**:++ `assertProductLimit(storeId, plan)` ++and++ `assertStoreLimit(userId, plan)` ++check counts before creation++
3. ++**Downgrade level**:++ `assertDowngradeSafe(supabase, userId, target)` ++blocks downgrades if current usage exceeds the target plan limits++

++Plan context is cached in Upstash Redis at key++ `plan:{userId}` ++with a 60-second TTL.++ `invalidatePlanCache(userId)` ++calls Redis DEL — used after++ `PATCH /api/subscription` ++so the new plan takes effect immediately.++

---

## ++11. Order State Machine++

++COD orders follow a strict one-way state machine. No skipping, no going backwards.++

```
pending ──► confirmed ──► shipped ──► delivered
   │              │
   ▼              ▼
cancelled      cancelled

shipped ──► returned
```

++**Transitions:**++


| ++From++      | ++Allowed next states++  |
| ------------- | ------------------------ |
| ++pending++   | ++confirmed, cancelled++ |
| ++confirmed++ | ++shipped, cancelled++   |
| ++shipped++   | ++delivered, returned++  |
| ++delivered++ | ++(terminal)++           |
| ++returned++  | ++(terminal)++           |
| ++cancelled++ | ++(terminal)++           |


++Enforced by++ `assertOrderStatusTransition` ++in++ `src/lib/server/order-status.ts`++. Both the dashboard PATCH route and the delivery webhook route use this function. Illegal transitions return a French++ `ValidationError`++.++

++Each transition also writes to a timestamp column:++ `confirmed_at`++,++ `shipped_at`++,++ `delivered_at`++,++ `returned_at`++,++ `cancelled_at`++.++

---

## ++12. Analytics++

++Analytics is a two-part system:++

### ++Collection (storefront)++

`POST /api/analytics/events` ++— called fire-and-forget from the storefront. Events:++ `page_view`++,++ `product_view`++,++ `cart_add`++,++ `checkout_start`++,++ `order_placed`++. Each event stores++ `store_id`++,++ `event_type`++,++ `product_id` ++(optional),++ `wilaya_id` ++(optional),++ `session_id` ++(anonymous localStorage UUID), and device type. **Append-only table — never updated or deleted.++**

### ++Query (dashboard, Growth+)++

++Five read endpoints:++

- ++**overview**: total events by type + order count + revenue for a date range++
- ++**revenue**: daily series (MAD + order count per day)++
- ++**funnel**: page_view → product_view → cart_add → checkout_start → order_placed counts + step-by-step conversion %++
- ++**products**: top 20 products by revenue++
- ++**wilayas**: per-wilaya order and revenue breakdown++

++Revenue only counts orders in++ `confirmed`++,++ `shipped`++, or++ `delivered` ++states.++

---

## ++13. Data Design Decisions++

### ++Prices as integers in MAD++

++All prices are stored as integers (150 = 150 MAD). No decimals, no centimes. Eliminates floating point rounding issues.++

### ++Order items as snapshots++

`order_items` ++stores++ `product_name`++,++ `variant_label`++,++ `product_image`++,++ `unit_price_mad`++,++ `total_price_mad` ++at order time. Past orders are never joined to the live++ `products` ++table — the snapshot is the source of truth for order history. Price changes, product deletions, and name changes never affect past orders.++

### ++EAV for product attributes++

`attribute_definitions` ++→++ `attribute_values` ++→++ `variant_attribute_values` ++(pivot). This supports any attribute type (size, color, material, condition for vintage, etc.) without schema migrations. The tradeoff is slightly more complex variant queries.++

### ++RLS for tenant isolation++

++Supabase Row Level Security enforces that merchants can only read/write their own data. Application code does not manually add++ `WHERE user_id = x` ++— RLS handles it. Admin client (++`createAdminClient()`++) bypasses RLS and is used only in webhooks, cron, and checkout (where the caller is trusted server code, not a merchant session).++

### ++Guest checkout++

++Customers never create accounts. Orders store++ `customer_name`++,++ `customer_phone`++,++ `customer_address`++,++ `customer_city`++,++ `wilaya_id` ++directly on the++ `orders` ++row. No++ `customer_id` ++foreign key.++

---

## ++14. Performance Optimizations Applied++


| ++Optimization++                  | ++File(s)++                      | ++Impact++                                                                               |
| --------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| ++Vercel region++ `lhr1`          | `vercel.json`                    | ++DB round-trip: ~200 ms → ~20 ms++                                                      |
| ++Redis plan cache (60 s TTL)++   | `src/lib/api/with-plan.ts`       | `withPlan()` ++costs 0 DB queries on cache hit (previously hit Supabase every call)++    |
| ++Single-query ownership checks++ | ++All route handlers++           | ++Removed one redundant++ `stores` ++read per request (was 2 queries per handler)++      |
| `api` ++preset bypass++           | `src/lib/api/with-rate-limit.ts` | ++Dashboard GETs skip Redis (~15 ms saved). Intentional — authenticated users trusted.++ |
| ++Wilayas CDN cache++             | `src/app/api/wilayas/route.ts`   | `s-maxage=3600, stale-while-revalidate=86400` ++— rarely changes++                       |


---

## ++15. What Is Done vs What Comes Next++

### ++Done (backend API — complete)++

- ++Database schema + RLS + triggers (++`db/`++)++
- ++Security layer:++ `withAuth`++,++ `withUserAuth`++,++ `withPlan`++,++ `withRateLimit`++,++ `withWebhook`
- ++Full CRUD: stores, shipping zones, products, variants, attributes + values++
- ++Orders: dashboard list + detail + status PATCH with COD state machine++
- ++Analytics: event ingestion + 5 query endpoints (Growth+)++
- ++Storefront API: product listing, product detail, shipping lookup, guest checkout++
- ++File upload: signed Supabase Storage URLs++
- ++WhatsApp: outbound notifications (new order → merchant; confirmed/shipped → customer)++
- ++WhatsApp: inbound webhook parsing (Meta payload validated and summarized)++
- ++Webhooks: delivery status updates from shipping partners++
- ++Cron: subscription expiry check++
- ++Profile API: GET + PATCH++
- ++Subscription API: GET + PATCH (upgrade/downgrade with guards)++
- ++Performance: Vercel region, Redis plan cache, single-query ownership++

---

### ++What Comes Next (priority order)++

#### ++1. Connect the UI to the API (frontend wiring)++

++The backend is fully built. The dashboard and storefront UI components exist but call stub data or placeholder functions. The next step is to wire every page to its API route:++

- ++**Dashboard home**: call++ `GET /api/stores` +++++ `GET /api/orders?store_id=&limit=5`
- ++**Store settings page**: call++ `GET/PATCH /api/stores/[id]`
- ++**Products page**: call++ `GET /api/products?store_id=` +++++ `POST /api/products` +++++ `PATCH /api/products/[id]`
- ++**Variants editor**: call++ `GET/POST/PATCH/DELETE /api/products/[id]/variants`
- ++**Orders page**: call++ `GET /api/orders?store_id=` ++with status filter +++ `PATCH /api/orders/[id]`
- ++**Analytics page**: call all 5 analytics endpoints++
- ++**Shipping settings**: call++ `GET/POST/PATCH/DELETE /api/stores/[id]/shipping-zones`
- ++**Profile page**: call++ `GET/PATCH /api/profile`
- ++**Subscription / billing page**: call++ `GET/PATCH /api/subscription`

#### ++2. WhatsApp inbound message handling++

++The webhook parses incoming messages but does not act on them. Concrete things to build:++

- ++**Customer replies "confirm"** → auto-confirm the last pending order from that phone number++
- ++**Customer asks for order status** → look up last order by phone, reply with current status++
- ++**Keyword routing**:++ `STOP` ++→ unsubscribe from notifications++

++Implementation: in++ `POST /api/webhooks/whatsapp`++, after the Zod parse succeeds, iterate++ `messages` ++in the payload, match phone numbers to orders, call++ `sendWhatsAppText` ++for replies.++

#### ++3. Real billing / CMI integration++

++The current++ `PATCH /api/subscription` ++resets the billing period to++ `now + 30 days` ++as a stub. When CMI (Centre Monétique Interbancaire) or another Moroccan payment gateway is integrated:++

- ++Add a++ `payments` ++table to record transactions++
- `PATCH /api/subscription` ++should only activate the plan after payment confirmation++
- ++Webhook from CMI confirms payment → trigger plan activation++
- `current_period_start/end` ++should be set based on actual payment date, not just +30 days++

#### ++4. Custom domains++

++The multi-tenant routing already supports subdomain routing. For custom domains (++`mybrand.ma` ++instead of++ `mybrand.platform.ma`++):++

- ++Merchant submits their domain in store settings++
- ++Vercel API is called to add the domain to the project++
- ++CNAME/A record instructions shown to merchant++
- `middleware.ts` ++needs to handle the non-subdomain hostname pattern++

#### ++5. Staff accounts (Pro plan)++

++The++ `has_staff` ++feature flag exists in the plans table but nothing uses it yet:++

- ++Invite system: merchant sends email invite to a staff email++
- ++Staff signs up with limited role (can manage orders, cannot change billing)++
- ++RLS policies need++ `staff_members` ++table + adjusted policies++
- `withAuth` ++or++ `withUserAuth` ++needs to resolve staff context++

#### ++6. Supabase Storage policies++

++The current upload flow issues signed URLs correctly with++ `{userId}/{storeId}/...` ++path prefix. The Supabase Storage bucket policies are not yet fine-grained:++

- ++Add policy: only the owning user can upload to++ `{userId}/{storeId}/`
- ++Public read is fine (CDN serving product images)++
- ++Prevent merchants from reading each other's private assets++

#### ++7. Cron schedule in vercel.json++

++The subscription check cron job exists at++ `GET /api/cron/subscription-check` ++but the schedule is not yet in++ `vercel.json`++. Add:++

```json
{
  "regions": ["lhr1"],
  "crons": [
    {
      "path": "/api/cron/subscription-check",
      "schedule": "0 2 * * *"
    }
  ]
}
```

#### ++8.++ `GET /api/plans` ++public endpoint++

++Currently there is no public endpoint listing available plans with their prices and features. This is needed for the pricing page, the subscription management UI, and upgrade prompts. A simple public cached endpoint returning all rows from the++ `plans` ++table.++

---

## ++Environment Variables Reference++

```
# Server-only
SUPABASE_SERVICE_ROLE_KEY       Admin client (webhooks, cron, checkout)
SUPABASE_PROJECT_ID             For db:types generation
WHATSAPP_API_URL                Meta Cloud API base URL
WHATSAPP_PHONE_NUMBER_ID        Business phone ID
WHATSAPP_ACCESS_TOKEN           Bearer token for outbound messages
WHATSAPP_WEBHOOK_VERIFY_TOKEN   GET webhook challenge token
WHATSAPP_APP_SECRET             POST webhook HMAC secret
DELIVERY_WEBHOOK_SECRET         Shipping partner HMAC secret (min 32 chars)
UPSTASH_REDIS_REST_URL          Rate limiting + plan cache
UPSTASH_REDIS_REST_TOKEN        ^
CRON_SECRET                     Bearer token for cron job protection

# Public (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL        Browser Supabase client
NEXT_PUBLIC_SUPABASE_ANON_KEY   ^
NEXT_PUBLIC_ROOT_DOMAIN         platform.localhost (dev) / platform.ma (prod)
NEXT_PUBLIC_APP_URL             http://localhost:3000 (dev)
```

