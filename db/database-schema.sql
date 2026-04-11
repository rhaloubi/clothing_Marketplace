-- =============================================================================
-- Clothing marketplace — core schema (tables, indexes, RLS, seeds)
-- Run in Supabase SQL Editor BEFORE supabase-triggers.sql
-- After both files: run storage-buckets.sql (Storage buckets); then
--   bun run db:types
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Plans (subscription tiers) ─────────────────────────────────────────────

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name IN ('starter', 'growth', 'pro')),
  price_mad integer NOT NULL,
  max_stores integer NOT NULL,
  max_products integer,
  has_custom_domain boolean NOT NULL DEFAULT false,
  has_analytics boolean NOT NULL DEFAULT false,
  has_whatsapp boolean NOT NULL DEFAULT false,
  has_staff boolean NOT NULL DEFAULT false,
  has_api boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Reference: Moroccan regions (IDs 1–12 match checkout validation) ─────

CREATE TABLE public.wilayas (
  id smallint PRIMARY KEY CHECK (id >= 1 AND id <= 12),
  name_fr text NOT NULL,
  name_ar text NOT NULL,
  code text NOT NULL UNIQUE
);

CREATE TABLE public.shipping_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Merchants ──────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans (id),
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'cancelled', 'expired', 'past_due')
  ),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  banner_url text,
  theme text NOT NULL DEFAULT 'minimal' CHECK (theme IN ('minimal', 'bold', 'elegant')),
  theme_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_domain text,
  whatsapp_number text,
  is_active boolean NOT NULL DEFAULT true,
  order_counter integer NOT NULL DEFAULT 0,
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stores_user_id_idx ON public.stores (user_id);

-- ─── Catalog (EAV + variants) ─────────────────────────────────────────────────

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  base_price integer NOT NULL CHECK (base_price >= 0),
  compare_price integer,
  images text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  slug text NOT NULL,
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE INDEX products_store_id_idx ON public.products (store_id);

CREATE TABLE public.attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  name text NOT NULL,
  display_type text NOT NULL DEFAULT 'select' CHECK (
    display_type IN ('select', 'color_swatch', 'text', 'button')
  ),
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_definition_id uuid NOT NULL REFERENCES public.attribute_definitions (id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  color_hex text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attribute_definition_id, value)
);

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  sku text,
  price_override integer,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  images text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_variants_product_id_idx ON public.product_variants (product_id);

CREATE TABLE public.variant_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants (id) ON DELETE CASCADE,
  attribute_value_id uuid NOT NULL REFERENCES public.attribute_values (id) ON DELETE CASCADE,
  UNIQUE (variant_id, attribute_value_id)
);

-- ─── Shipping ─────────────────────────────────────────────────────────────────

CREATE TABLE public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  wilaya_id smallint NOT NULL REFERENCES public.wilayas (id),
  provider_id uuid REFERENCES public.shipping_providers (id),
  price_mad integer NOT NULL DEFAULT 0 CHECK (price_mad >= 0),
  free_shipping_threshold integer CHECK (
    free_shipping_threshold IS NULL OR free_shipping_threshold >= 0
  ),
  estimated_days_min integer NOT NULL DEFAULT 2 CHECK (estimated_days_min >= 1),
  estimated_days_max integer NOT NULL DEFAULT 5 CHECK (estimated_days_max >= 1),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, wilaya_id),
  CHECK (estimated_days_max >= estimated_days_min)
);

-- ─── Orders (guest COD) ───────────────────────────────────────────────────────

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled')
  ),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  customer_city text NOT NULL,
  wilaya_id smallint NOT NULL REFERENCES public.wilayas (id),
  customer_notes text,
  subtotal_mad integer NOT NULL,
  shipping_cost_mad integer NOT NULL,
  total_mad integer NOT NULL,
  shipping_provider_id uuid REFERENCES public.shipping_providers (id),
  tracking_number text,
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  returned_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, order_number)
);

CREATE INDEX orders_store_id_idx ON public.orders (store_id);
CREATE INDEX orders_store_created_idx ON public.orders (store_id, created_at DESC);
CREATE INDEX orders_store_status_created_idx ON public.orders (store_id, status, created_at DESC);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants (id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_label text NOT NULL,
  product_image text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_mad integer NOT NULL,
  total_price_mad integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);

-- ─── Analytics (append-only) ──────────────────────────────────────────────────

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders (id) ON DELETE SET NULL,
  session_id text,
  wilaya_id smallint REFERENCES public.wilayas (id),
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text CHECK (
    device_type IS NULL OR device_type IN ('mobile', 'tablet', 'desktop')
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_store_id_idx ON public.analytics_events (store_id);
CREATE INDEX analytics_events_created_at_idx ON public.analytics_events (created_at);

-- ─── Seeds: plans ─────────────────────────────────────────────────────────────

INSERT INTO public.plans (
  name,
  price_mad,
  max_stores,
  max_products,
  has_custom_domain,
  has_analytics,
  has_whatsapp,
  has_staff,
  has_api
)
VALUES
  ('starter', 99, 1, 50, false, false, false, false, false),
  ('growth', 249, 1, NULL, true, true, true, false, false),
  ('pro', 499, 3, NULL, true, true, true, true, true);

-- ─── Seeds: wilayas (12 regions) ────────────────────────────────────────────

INSERT INTO public.wilayas (id, name_fr, name_ar, code)
VALUES
  (1, 'Casablanca-Settat', 'الدار البيضاء-سطات', 'CAS'),
  (2, 'Marrakech-Safi', 'مراكش-آسفي', 'MAR'),
  (3, 'Rabat-Salé-Kénitra', 'الرباط-سلا-القنيطرة', 'RAB'),
  (4, 'Fès-Meknès', 'فاس-مكناس', 'FES'),
  (5, 'Tanger-Tétouan-Al Hoceïma', 'طنجة-تطوان-الحسيمة', 'TNG'),
  (6, "L'Oriental", 'الشرق', 'ORI'),
  (7, 'Drâa-Tafilalet', 'درعة-تافيلالت', 'DRA'),
  (8, 'Souss-Massa', 'سوس-ماسة', 'SSM'),
  (9, 'Béni Mellal-Khénifra', 'بني ملال-خنيفرة', 'BMK'),
  (10, 'Laâyoune-Sakia El Hamra', 'العيون-الساقية الحمراء', 'LAA'),
  (11, 'Dakhla-Oued Ed-Dahab', 'الداخلة-وادي الذهب', 'DAK'),
  (12, 'Guelmim-Oued Noun', 'كلميم-واد نون', 'GUE');

-- ─── Seeds: shipping providers ───────────────────────────────────────────────

INSERT INTO public.shipping_providers (name, is_active)
VALUES
  ('Amana', true),
  ('CTM', true),
  ('Barid Al-Maghrib', true);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wilayas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- plans, wilayas, shipping_providers: world-readable
CREATE POLICY plans_select ON public.plans FOR SELECT USING (true);
CREATE POLICY wilayas_select ON public.wilayas FOR SELECT USING (true);
CREATE POLICY shipping_providers_select ON public.shipping_providers FOR SELECT USING (true);

-- profiles
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- subscriptions (read own; writes via SECURITY DEFINER triggers / service_role)
CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT USING (user_id = auth.uid());

-- stores: active storefronts visible to everyone; owners full CRUD
CREATE POLICY stores_select_public ON public.stores FOR SELECT USING (is_active = true);
CREATE POLICY stores_merchant_all ON public.stores FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- products: public sees active products on active stores; merchants full CRUD on their catalog
CREATE POLICY products_select_public ON public.products FOR SELECT USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.is_active = true
  )
);
CREATE POLICY products_merchant_all ON public.products FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.user_id = auth.uid()
  )
);

-- attribute_definitions
CREATE POLICY attribute_definitions_select_public ON public.attribute_definitions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = attribute_definitions.store_id AND s.is_active = true
  )
);
CREATE POLICY attribute_definitions_merchant_all ON public.attribute_definitions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = attribute_definitions.store_id AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = attribute_definitions.store_id AND s.user_id = auth.uid()
  )
);

-- attribute_values (via definition → store)
CREATE POLICY attribute_values_select_public ON public.attribute_values FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.attribute_definitions d
    JOIN public.stores s ON s.id = d.store_id
    WHERE d.id = attribute_values.attribute_definition_id AND s.is_active = true
  )
);
CREATE POLICY attribute_values_merchant_all ON public.attribute_values FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.attribute_definitions d
    JOIN public.stores s ON s.id = d.store_id
    WHERE d.id = attribute_values.attribute_definition_id AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.attribute_definitions d
    JOIN public.stores s ON s.id = d.store_id
    WHERE d.id = attribute_values.attribute_definition_id AND s.user_id = auth.uid()
  )
);

-- product_variants
CREATE POLICY product_variants_select_public ON public.product_variants FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_variants.product_id AND p.is_active = true AND s.is_active = true
  )
);
CREATE POLICY product_variants_merchant_all ON public.product_variants FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_variants.product_id AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_variants.product_id AND s.user_id = auth.uid()
  )
);

-- variant_attribute_values
CREATE POLICY variant_attribute_values_select_public ON public.variant_attribute_values FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    JOIN public.stores s ON s.id = p.store_id
    WHERE v.id = variant_attribute_values.variant_id AND p.is_active = true AND s.is_active = true
  )
);
CREATE POLICY variant_attribute_values_merchant_all ON public.variant_attribute_values FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    JOIN public.stores s ON s.id = p.store_id
    WHERE v.id = variant_attribute_values.variant_id AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    JOIN public.stores s ON s.id = p.store_id
    WHERE v.id = variant_attribute_values.variant_id AND s.user_id = auth.uid()
  )
);

-- shipping_zones
CREATE POLICY shipping_zones_select_public ON public.shipping_zones FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = shipping_zones.store_id AND s.is_active = true
  )
);
CREATE POLICY shipping_zones_merchant_all ON public.shipping_zones FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = shipping_zones.store_id AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = shipping_zones.store_id AND s.user_id = auth.uid()
  )
);

-- orders: guest insert on active store; merchants manage their store orders
CREATE POLICY orders_insert_public ON public.orders FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.is_active = true
  )
);
CREATE POLICY orders_merchant_all ON public.orders FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.user_id = auth.uid()
  )
);

-- order_items: insert with valid order on active store; merchants read/update/delete own
CREATE POLICY order_items_insert_public ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE o.id = order_items.order_id AND s.is_active = true
  )
);
CREATE POLICY order_items_merchant_all ON public.order_items FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE o.id = order_items.order_id AND s.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE o.id = order_items.order_id AND s.user_id = auth.uid()
  )
);

-- analytics: fire-and-forget from storefront; merchants read own
CREATE POLICY analytics_insert_public ON public.analytics_events FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = analytics_events.store_id AND s.is_active = true
  )
);
CREATE POLICY analytics_select_merchant ON public.analytics_events FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = analytics_events.store_id AND s.user_id = auth.uid()
  )
);

-- ─── Grants (API roles) ───────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
