-- Analytics daily aggregate backfill helpers
-- Run after applying db/migrations/003_analytics_sql_aggregations.sql

-- Example 1: backfill one store for April 2026
-- select public.analytics_backfill_range(
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   '2026-04-01'::date,
--   '2026-04-30'::date
-- );

-- Example 2: process queued jobs in batches
-- select * from public.analytics_process_jobs_batch(500);

-- Example 3: validate aggregate vs raw on one day/store
-- select * from public.analytics_aggregate_validation(
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   '2026-04-26'::date
-- );

-- Optional global backfill (all stores) for a period:
-- do $$
-- declare
--   r record;
-- begin
--   for r in select id from public.stores loop
--     perform public.analytics_backfill_range(r.id, '2026-01-01'::date, '2026-04-30'::date);
--   end loop;
-- end $$;
