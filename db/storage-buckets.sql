-- =============================================================================
-- Supabase Storage — create public buckets for the marketplace
-- Run in SQL Editor AFTER database-schema.sql (or anytime buckets are missing).
-- Without these buckets, POST /api/upload returns "The related resource does not exist".
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('store-assets', 'store-assets', true),
  ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public;
