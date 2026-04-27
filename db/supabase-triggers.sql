-- =============================================================================
-- Run in Supabase SQL Editor AFTER database-schema.sql
-- =============================================================================

-- ─── Auth: profile on signup ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
      'Marchand'
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── Starter subscription when profile is created ────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  starter_id uuid;
BEGIN
  SELECT id INTO starter_id FROM public.plans WHERE name = 'starter' LIMIT 1;
  IF starter_id IS NULL THEN
    RAISE EXCEPTION 'starter plan not seeded';
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  )
  VALUES (
    NEW.id,
    starter_id,
    'active',
    now(),
    now() + interval '30 days'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

-- ─── updated_at ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS stores_set_updated_at ON public.stores;
CREATE TRIGGER stores_set_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS attribute_definitions_set_updated_at ON public.attribute_definitions;
CREATE TRIGGER attribute_definitions_set_updated_at
  BEFORE UPDATE ON public.attribute_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS product_variants_set_updated_at ON public.product_variants;
CREATE TRIGGER product_variants_set_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS shipping_zones_set_updated_at ON public.shipping_zones;
CREATE TRIGGER shipping_zones_set_updated_at
  BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── Stock decrement (checkout / admin) ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.decrement_stock(p_variant_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  UPDATE public.product_variants
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_variant_id
    AND stock_quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_stock_or_variant_not_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO service_role;

-- ─── Monotonic per-store order numbers (guest checkout; avoids COUNT race) ───

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

-- ─── Analytics incremental aggregation (hybrid: direct + outbox) ─────────────

CREATE OR REPLACE FUNCTION public.analytics_events_direct_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
BEGIN
  v_date := public.casablanca_date_key(NEW.created_at);
  PERFORM public.analytics_upsert_event_daily(NEW.store_id, v_date, NEW.event_type, 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_events_direct_aggregate_tg ON public.analytics_events;
CREATE TRIGGER analytics_events_direct_aggregate_tg
  AFTER INSERT ON public.analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION public.analytics_events_direct_aggregate();

CREATE OR REPLACE FUNCTION public.analytics_orders_enqueue_jobs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_date date;
  v_old_date date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_date := public.casablanca_date_key(NEW.created_at);
    PERFORM public.analytics_enqueue_job(NEW.store_id, v_new_date, 'orders');
    PERFORM public.analytics_enqueue_job(NEW.store_id, v_new_date, 'products');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_new_date := public.casablanca_date_key(NEW.created_at);
    v_old_date := public.casablanca_date_key(OLD.created_at);

    PERFORM public.analytics_enqueue_job(NEW.store_id, v_new_date, 'orders');
    PERFORM public.analytics_enqueue_job(NEW.store_id, v_new_date, 'products');
    IF v_old_date <> v_new_date OR OLD.store_id <> NEW.store_id THEN
      PERFORM public.analytics_enqueue_job(OLD.store_id, v_old_date, 'orders');
      PERFORM public.analytics_enqueue_job(OLD.store_id, v_old_date, 'products');
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_old_date := public.casablanca_date_key(OLD.created_at);
    PERFORM public.analytics_enqueue_job(OLD.store_id, v_old_date, 'orders');
    PERFORM public.analytics_enqueue_job(OLD.store_id, v_old_date, 'products');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS analytics_orders_enqueue_jobs_tg ON public.orders;
CREATE TRIGGER analytics_orders_enqueue_jobs_tg
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.analytics_orders_enqueue_jobs();

CREATE OR REPLACE FUNCTION public.analytics_order_items_enqueue_products()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_created timestamptz;
  v_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT o.store_id, o.created_at INTO v_store_id, v_created
    FROM public.orders o
    WHERE o.id = OLD.order_id;
  ELSE
    SELECT o.store_id, o.created_at INTO v_store_id, v_created
    FROM public.orders o
    WHERE o.id = NEW.order_id;
  END IF;

  IF v_store_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_date := public.casablanca_date_key(v_created);
  PERFORM public.analytics_enqueue_job(v_store_id, v_date, 'products');
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS analytics_order_items_enqueue_products_tg ON public.order_items;
CREATE TRIGGER analytics_order_items_enqueue_products_tg
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.analytics_order_items_enqueue_products();
