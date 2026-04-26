-- ─────────────────────────────────────────────────────────────────────────────
-- Categories migration
-- Run this in Supabase SQL Editor AFTER the base database-schema.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create categories table
CREATE TABLE public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(trim(name)) > 0),
  slug       text NOT NULL CHECK (char_length(trim(slug)) > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE INDEX categories_store_id_idx ON public.categories (store_id);

-- Auto-update updated_at (reuses the existing trigger function)
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Add category_id FK to products (nullable — existing products have no category yet)
ALTER TABLE public.products
  ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX products_category_id_idx ON public.products (category_id);

-- 3. (Optional) Backfill: create category rows from distinct existing text values
--    and wire products to them. Safe to run even with 0 existing categories.
DO $$
DECLARE
  r RECORD;
  cat_id uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT store_id, category
    FROM public.products
    WHERE category IS NOT NULL AND trim(category) <> ''
  LOOP
    -- Generate a simple slug (lowercase, spaces to hyphens)
    INSERT INTO public.categories (store_id, name, slug, sort_order)
    VALUES (
      r.store_id,
      r.category,
      lower(regexp_replace(trim(r.category), '\s+', '-', 'g')),
      0
    )
    ON CONFLICT (store_id, slug) DO NOTHING;

    SELECT id INTO cat_id
    FROM public.categories
    WHERE store_id = r.store_id
      AND slug = lower(regexp_replace(trim(r.category), '\s+', '-', 'g'));

    IF cat_id IS NOT NULL THEN
      UPDATE public.products
         SET category_id = cat_id
       WHERE store_id = r.store_id AND category = r.category;
    END IF;
  END LOOP;
END $$;

-- 4. Remove the old free-text column (uncomment when ready — after verifying backfill)
-- ALTER TABLE public.products DROP COLUMN category;

-- 5. RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Merchants: full access to their own store's categories
CREATE POLICY categories_merchant_all ON public.categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = categories.store_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = categories.store_id AND s.user_id = auth.uid()
    )
  );

-- Public storefront can read categories of active stores
CREATE POLICY categories_select_public ON public.categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = categories.store_id AND s.is_active = true
    )
  );
