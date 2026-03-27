-- Per-store order_counter + atomic order number allocation (existing DBs).
-- Run in Supabase SQL Editor if you already applied database-schema.sql before
-- order_counter existed. Greenfield installs get this from database-schema.sql +
-- supabase-triggers.sql.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS order_counter integer NOT NULL DEFAULT 0;

UPDATE public.stores s
SET order_counter = (
  SELECT count(*)::integer FROM public.orders o WHERE o.store_id = s.id
);

CREATE OR REPLACE FUNCTION public.next_store_order_number(p_store_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.stores
  SET order_counter = order_counter + 1
  WHERE id = p_store_id
  RETURNING order_counter INTO n;

  IF n IS NULL THEN
    RAISE EXCEPTION 'store_not_found';
  END IF;

  RETURN '#' || lpad((1000 + n)::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_store_order_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_store_order_number(uuid) TO service_role;
