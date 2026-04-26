-- Aggregated category counts for dashboard filter performance.
create or replace function public.get_store_category_counts(p_store_id uuid)
returns table (category_id uuid, product_count bigint)
language sql
stable
as $$
  select
    p.category_id,
    count(*)::bigint as product_count
  from public.products p
  where p.store_id = p_store_id
    and p.category_id is not null
  group by p.category_id
$$;
