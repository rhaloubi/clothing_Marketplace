# Analytics Backfill Runbook (Dev)

This runbook explains how to backfill all current data after enabling:

- `db/migrations/003_analytics_sql_aggregations.sql`
- `db/supabase-triggers.sql`

It assumes **dev mode** with small data volume.

---

## 1) Pre-check

Run this in Supabase SQL editor:

```sql
-- Quick sanity: confirm functions exist
select proname
from pg_proc
where proname in (
  'analytics_backfill_range',
  'analytics_process_jobs_batch',
  'analytics_aggregate_validation',
  'analytics_recompute_day_orders',
  'analytics_recompute_day_products'
)
order by proname;
```

You should see all function names returned.

---

## 2) Full backfill for all stores

Use one global period that covers your old data.

```sql
do $$
declare
  r record;
  v_from date := '2024-01-01'::date; -- adjust if needed
  v_to date := current_date;
begin
  for r in select id from public.stores loop
    perform public.analytics_backfill_range(r.id, v_from, v_to);
  end loop;
end $$;
```

Notes:
- For dev data, this is usually enough in one run.
- If needed, split into windows (e.g. monthly).

---

## 3) Drain outbox jobs

Backfill + triggers can enqueue jobs. Process all pending jobs:

```sql
-- Run repeatedly until processed=0 and failed=0
select * from public.analytics_process_jobs_batch(1000);
```

You can execute it a few times manually in SQL editor.

Optional status check:

```sql
select status, count(*) 
from public.analytics_agg_jobs
group by status
order by status;
```

---

## 4) Validate raw vs aggregate

Check one store/day:

```sql
select * 
from public.analytics_aggregate_validation(
  '00000000-0000-0000-0000-000000000000'::uuid, -- replace store id
  current_date - 1
);
```

You should get two rows:
- `raw`
- `agg`

The metrics should match:
- `total_orders`
- `revenue_mad`
- `cancelled_orders`

For multiple days:

```sql
-- Replace store id and date range
with days as (
  select generate_series(current_date - 7, current_date - 1, interval '1 day')::date as d
)
select d.d as date_key, v.*
from days d
cross join lateral public.analytics_aggregate_validation(
  '00000000-0000-0000-0000-000000000000'::uuid, -- replace
  d.d
) v
order by d.d, v.source;
```

---

## 5) API smoke checks

After backfill, check these API routes in dev:

- `/api/analytics/overview?...`
- `/api/analytics/revenue?...`
- `/api/analytics/revenue-compare?...`
- `/api/analytics/products?...`
- `/api/analytics/funnel?...`
- `/api/analytics/wilayas?...`

Expected:
- Faster response than raw scans
- No missing-day gaps on current windows

---

## 6) Cron in dev (optional but recommended)

Use your cron route:

- `GET /api/cron/analytics-agg?action=process`

Run it periodically while testing (or wire local scheduler).

Also available:

- `GET /api/cron/analytics-agg?action=backfill&store_id=<uuid>&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/cron/analytics-agg?action=validate&store_id=<uuid>&date_key=YYYY-MM-DD`

---

## 7) Timezone note (Casablanca vs UTC)

Daily aggregation is based on **Casablanca calendar day** (not UTC midnight).
That is already handled in SQL via timezone-aware date keys.

So a local day boundary follows Casablanca midnight, even if UTC date differs.
