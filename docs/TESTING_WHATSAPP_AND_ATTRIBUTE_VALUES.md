# Testing guide — WhatsApp outbound (#1) & attribute values CRUD (#3)

Date: 2026-03-27

Prerequisites: logged-in merchant session (`cookies.txt`), `store_id`, optional `ATTRIBUTE_DEF_ID` and `VALUE_ID` from API responses.

Replace placeholders:

- `BASE` — `http://localhost:3000`
- `COOKIES` — `-b cookies.txt` (or `-H "Cookie: ..."`)

---

## Part A — WhatsApp outbound (feature #1)

### A.0 Requirements

- **Growth (or Pro) plan** on the merchant account (`plans.has_whatsapp = true`).
- **Store** `whatsapp_number` in Moroccan format: `+2126xxxxxxxx` or `06xxxxxxxx` (same as checkout validation for reliable parsing).
- **Meta WhatsApp Cloud API** env vars set and valid: `WHATSAPP_API_URL`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`.
- **Customer phone** on orders must match checkout regex for customer texts.

### A.1 Merchant alert — new order (guest checkout)

1. Note store **slug** (`tenant`) and ensure Growth+ + `whatsapp_number`.
2. Place a guest order:

```bash
curl -s -X POST "$BASE/api/storefront/YOUR_STORE_SLUG/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Client",
    "customer_phone": "+212612345678",
    "customer_address": "Rue 1",
    "customer_city": "Casablanca",
    "wilaya_id": 1,
    "items": [{ "variant_id": "VARIANT_UUID", "quantity": 1 }]
  }'
```

3. **Expect:** `201` JSON with `order_id`, `order_number`. Merchant WhatsApp should receive the French plain-text **new order** message (if API credentials work). Checkout still succeeds if WhatsApp fails (errors are logged server-side only).

### A.2 Customer alert — `confirmed` / `shipped`

1. **PATCH** order status (dashboard session):

```bash
# confirmed
curl -s -X PATCH "$BASE/api/orders/ORDER_UUID" $COOKIES \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}'

# shipped (after confirmed)
curl -s -X PATCH "$BASE/api/orders/ORDER_UUID" $COOKIES \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped","tracking_number":"AM123"}'
```

2. **Expect:** `200` with updated order. Customer receives WhatsApp for **confirmed** then **shipped** (with optional tracking line) when plan allows.

### A.3 Negative checks

- **Starter plan:** no WhatsApp sends (plan gate); checkout and PATCH still succeed.
- **Invalid Meta token:** merchant/customer may not receive messages; server logs `[whatsapp] ...`; HTTP responses unchanged.

---

## Part B — Attribute values CRUD (feature #3)

### B.1 List definitions (find `ATTRIBUTE_DEF_ID`)

```bash
curl -s "$BASE/api/attributes?store_id=STORE_UUID" $COOKIES
```

Pick an `id` from a definition and a value `id` if you need PATCH/DELETE.

### B.2 POST — add one value

```bash
curl -s -X POST "$BASE/api/attributes/ATTRIBUTE_DEF_ID/values" $COOKIES \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Bleu roi",
    "value": "bleu-roi",
    "color_hex": "#1E3A8A",
    "sort_order": 10
  }'
```

**Expect:** `201` with the new `attribute_values` row.  
**409** if `value` duplicates `(attribute_definition_id, value)` unique constraint.

### B.3 PATCH — update value

```bash
curl -s -X PATCH "$BASE/api/attributes/ATTRIBUTE_DEF_ID/values/VALUE_UUID" $COOKIES \
  -H "Content-Type: application/json" \
  -d '{"label":"Bleu nuit","sort_order":5}'
```

**Expect:** `200` with updated row.  
**404** if `valueId` does not belong to `ATTRIBUTE_DEF_ID`.  
**409** on duplicate `value` string for that definition.

### B.4 DELETE — remove value (only if unused)

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X DELETE "$BASE/api/attributes/ATTRIBUTE_DEF_ID/values/VALUE_UUID" $COOKIES
```

**Expect:** `204` when no `variant_attribute_values` reference this value.  
**409** if any variant still uses it:

> `Impossible de supprimer cette valeur : elle est encore liée à une ou plusieurs variantes.`

### B.5 Verify GET definition includes new value

```bash
curl -s "$BASE/api/attributes/ATTRIBUTE_DEF_ID" $COOKIES
```

**Expect:** `values` array includes POST/PATCH results ordered by `sort_order`.

---

## Quick checklist

| Check | Endpoint / action |
|-------|-------------------|
| WhatsApp merchant | POST storefront checkout (Growth+, `whatsapp_number`) |
| WhatsApp customer | PATCH order → `confirmed`, then `shipped` |
| Value create | POST `/api/attributes/{id}/values` |
| Value update | PATCH `/api/attributes/{id}/values/{valueId}` |
| Value delete guard | DELETE while variant linked → 409 |
| Value delete OK | DELETE after removing variant links → 204 |
