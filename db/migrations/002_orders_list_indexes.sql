-- Orders list performance: store-scoped sorts and filtered lists.
-- Run after database-schema.sql on existing projects.
-- ILIKE '%term%' on customer_phone / name still benefits from pg_trgm + GIN later (phase 2).

CREATE INDEX IF NOT EXISTS orders_store_created_idx
  ON public.orders (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_store_status_created_idx
  ON public.orders (store_id, status, created_at DESC);

COMMENT ON INDEX public.orders_store_created_idx IS
  'Dashboard orders list: newest first per store.';
COMMENT ON INDEX public.orders_store_status_created_idx IS
  'Dashboard orders list with status filter.';
