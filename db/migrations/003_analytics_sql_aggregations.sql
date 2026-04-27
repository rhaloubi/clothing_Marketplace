-- Analytics SQL aggregations (Casablanca timezone)

create or replace function public.analytics_overview_daily_agg(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_tz text default 'Africa/Casablanca'
)
returns table (
  date_key date,
  total_orders bigint,
  completed_orders bigint,
  cancelled_orders bigint,
  in_progress_orders bigint,
  revenue_mad bigint,
  revenue_orders bigint
)
language sql
stable
as $$
  with days as (
    select generate_series(
      timezone(p_tz, p_from)::date,
      (timezone(p_tz, p_to - interval '1 second'))::date,
      interval '1 day'
    )::date as date_key
  ),
  agg as (
    select
      timezone(p_tz, o.created_at)::date as date_key,
      count(*)::bigint as total_orders,
      count(*) filter (where o.status = 'delivered')::bigint as completed_orders,
      count(*) filter (where o.status = 'cancelled')::bigint as cancelled_orders,
      count(*) filter (where o.status not in ('delivered', 'cancelled'))::bigint as in_progress_orders,
      coalesce(sum(o.total_mad) filter (where o.status not in ('cancelled', 'returned')), 0)::bigint as revenue_mad,
      count(*) filter (where o.status not in ('cancelled', 'returned'))::bigint as revenue_orders
    from public.orders o
    where
      o.store_id = p_store_id
      and o.created_at >= p_from
      and o.created_at < p_to
    group by 1
  )
  select
    d.date_key,
    coalesce(a.total_orders, 0) as total_orders,
    coalesce(a.completed_orders, 0) as completed_orders,
    coalesce(a.cancelled_orders, 0) as cancelled_orders,
    coalesce(a.in_progress_orders, 0) as in_progress_orders,
    coalesce(a.revenue_mad, 0) as revenue_mad,
    coalesce(a.revenue_orders, 0) as revenue_orders
  from days d
  left join agg a using (date_key)
  order by d.date_key asc;
$$;

create or replace function public.analytics_fulfillment_agg(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  total_orders bigint,
  cancelled_orders bigint,
  prep_seconds_avg numeric,
  delivery_seconds_avg numeric
)
language sql
stable
as $$
  select
    count(*)::bigint as total_orders,
    count(*) filter (where o.status = 'cancelled')::bigint as cancelled_orders,
    coalesce(avg(extract(epoch from (o.confirmed_at - o.created_at))) filter (where o.confirmed_at is not null), 0) as prep_seconds_avg,
    coalesce(avg(extract(epoch from (o.delivered_at - o.created_at))) filter (where o.delivered_at is not null), 0) as delivery_seconds_avg
  from public.orders o
  where
    o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to;
$$;

create or replace function public.analytics_peak_hours_agg(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_tz text default 'Africa/Casablanca'
)
returns table (
  hour_of_day int,
  orders bigint,
  revenue_mad bigint
)
language sql
stable
as $$
  select
    extract(hour from timezone(p_tz, o.created_at))::int as hour_of_day,
    count(*)::bigint as orders,
    coalesce(sum(o.total_mad), 0)::bigint as revenue_mad
  from public.orders o
  where
    o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to
    and o.status not in ('cancelled', 'returned')
  group by 1
  order by 2 desc, 1 asc;
$$;

create or replace function public.analytics_products_agg(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  product_id uuid,
  product_name text,
  quantity_sold bigint,
  revenue_mad bigint,
  order_count bigint,
  revenue_share numeric,
  avg_revenue_per_order numeric
)
language sql
stable
as $$
  with base as (
    select
      oi.product_id,
      max(oi.product_name)::text as product_name,
      sum(oi.quantity)::bigint as quantity_sold,
      sum(oi.total_price_mad)::bigint as revenue_mad,
      count(distinct oi.order_id)::bigint as order_count
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where
      o.store_id = p_store_id
      and o.created_at >= p_from
      and o.created_at < p_to
      and o.status not in ('cancelled', 'returned')
      and oi.product_id is not null
    group by oi.product_id
  )
  select
    b.product_id,
    b.product_name,
    b.quantity_sold,
    b.revenue_mad,
    b.order_count,
    coalesce(round((b.revenue_mad::numeric * 100.0) / nullif(sum(b.revenue_mad) over (), 0), 1), 0) as revenue_share,
    coalesce(round(b.revenue_mad::numeric / nullif(b.order_count, 0), 0), 0) as avg_revenue_per_order
  from base b
  order by b.revenue_mad desc;
$$;

create or replace function public.analytics_product_pairs_agg(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  product_id_a uuid,
  name_a text,
  product_id_b uuid,
  name_b text,
  co_occurrence_count bigint,
  support_percent numeric,
  total_orders_analyzed bigint
)
language sql
stable
as $$
  with eligible_orders as (
    select o.id
    from public.orders o
    where
      o.store_id = p_store_id
      and o.created_at >= p_from
      and o.created_at < p_to
      and o.status not in ('cancelled', 'returned')
  ),
  order_products as (
    select distinct
      oi.order_id,
      oi.product_id,
      oi.product_name
    from public.order_items oi
    join eligible_orders eo on eo.id = oi.order_id
    where oi.product_id is not null
  ),
  pair_counts as (
    select
      a.product_id as product_id_a,
      max(a.product_name)::text as name_a,
      b.product_id as product_id_b,
      max(b.product_name)::text as name_b,
      count(distinct a.order_id)::bigint as co_occurrence_count
    from order_products a
    join order_products b
      on a.order_id = b.order_id
     and a.product_id < b.product_id
    group by a.product_id, b.product_id
  ),
  totals as (
    select count(*)::bigint as total_orders_analyzed
    from eligible_orders
  )
  select
    p.product_id_a,
    p.name_a,
    p.product_id_b,
    p.name_b,
    p.co_occurrence_count,
    coalesce(round((p.co_occurrence_count::numeric * 100.0) / nullif(t.total_orders_analyzed, 0), 1), 0) as support_percent,
    t.total_orders_analyzed
  from pair_counts p
  cross join totals t
  order by p.co_occurrence_count desc, p.product_id_a, p.product_id_b;
$$;

create or replace function public.analytics_product_timeslot_agg(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_tz text default 'Africa/Casablanca'
)
returns table (
  slot text,
  product_id uuid,
  product_name text,
  quantity_sold bigint,
  revenue_mad bigint,
  slot_total_items bigint,
  slot_total_revenue bigint
)
language sql
stable
as $$
  with base as (
    select
      case
        when extract(hour from timezone(p_tz, o.created_at)) >= 6 and extract(hour from timezone(p_tz, o.created_at)) < 11 then 'MORNING'
        when extract(hour from timezone(p_tz, o.created_at)) >= 11 and extract(hour from timezone(p_tz, o.created_at)) < 14 then 'LUNCH'
        when extract(hour from timezone(p_tz, o.created_at)) >= 14 and extract(hour from timezone(p_tz, o.created_at)) < 17 then 'AFTERNOON'
        when extract(hour from timezone(p_tz, o.created_at)) >= 17 and extract(hour from timezone(p_tz, o.created_at)) < 21 then 'EVENING'
        else 'NIGHT'
      end as slot,
      oi.product_id,
      max(oi.product_name)::text as product_name,
      sum(oi.quantity)::bigint as quantity_sold,
      sum(oi.total_price_mad)::bigint as revenue_mad
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where
      o.store_id = p_store_id
      and o.created_at >= p_from
      and o.created_at < p_to
      and o.status not in ('cancelled', 'returned')
      and oi.product_id is not null
    group by 1, 2
  )
  select
    b.slot,
    b.product_id,
    b.product_name,
    b.quantity_sold,
    b.revenue_mad,
    sum(b.quantity_sold) over (partition by b.slot) as slot_total_items,
    sum(b.revenue_mad) over (partition by b.slot) as slot_total_revenue
  from base b
  order by b.slot, b.revenue_mad desc;
$$;

create or replace function public.analytics_product_trends_agg(
  p_store_id uuid,
  p_current_from timestamptz,
  p_current_to timestamptz,
  p_previous_from timestamptz,
  p_previous_to timestamptz
)
returns table (
  product_id uuid,
  product_name text,
  current_quantity bigint,
  current_revenue bigint,
  previous_quantity bigint,
  previous_revenue bigint,
  quantity_change_percent numeric,
  revenue_change_percent numeric
)
language sql
stable
as $$
  with current_period as (
    select
      oi.product_id,
      max(oi.product_name)::text as product_name,
      sum(oi.quantity)::bigint as qty,
      sum(oi.total_price_mad)::bigint as rev
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where
      o.store_id = p_store_id
      and o.created_at >= p_current_from
      and o.created_at < p_current_to
      and o.status not in ('cancelled', 'returned')
      and oi.product_id is not null
    group by oi.product_id
  ),
  previous_period as (
    select
      oi.product_id,
      max(oi.product_name)::text as product_name,
      sum(oi.quantity)::bigint as qty,
      sum(oi.total_price_mad)::bigint as rev
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where
      o.store_id = p_store_id
      and o.created_at >= p_previous_from
      and o.created_at < p_previous_to
      and o.status not in ('cancelled', 'returned')
      and oi.product_id is not null
    group by oi.product_id
  )
  select
    coalesce(c.product_id, p.product_id) as product_id,
    coalesce(c.product_name, p.product_name) as product_name,
    coalesce(c.qty, 0)::bigint as current_quantity,
    coalesce(c.rev, 0)::bigint as current_revenue,
    coalesce(p.qty, 0)::bigint as previous_quantity,
    coalesce(p.rev, 0)::bigint as previous_revenue,
    case
      when coalesce(p.qty, 0) = 0 and coalesce(c.qty, 0) > 0 then 100
      when coalesce(p.qty, 0) = 0 then 0
      else round(((coalesce(c.qty, 0)::numeric - p.qty::numeric) / p.qty::numeric) * 100, 1)
    end as quantity_change_percent,
    case
      when coalesce(p.rev, 0) = 0 and coalesce(c.rev, 0) > 0 then 100
      when coalesce(p.rev, 0) = 0 then 0
      else round(((coalesce(c.rev, 0)::numeric - p.rev::numeric) / p.rev::numeric) * 100, 1)
    end as revenue_change_percent
  from current_period c
  full outer join previous_period p on p.product_id = c.product_id
  order by current_revenue desc, current_quantity desc;
$$;

create or replace function public.analytics_funnel_agg(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  product_views bigint,
  cart_adds bigint,
  checkout_starts bigint,
  orders_placed bigint
)
language sql
stable
as $$
  select
    count(*) filter (where e.event_type = 'product_view')::bigint as product_views,
    count(*) filter (where e.event_type = 'cart_add')::bigint as cart_adds,
    count(*) filter (where e.event_type = 'checkout_start')::bigint as checkout_starts,
    count(*) filter (where e.event_type = 'order_placed')::bigint as orders_placed
  from public.analytics_events e
  where
    e.store_id = p_store_id
    and e.created_at >= p_from
    and e.created_at < p_to;
$$;

create or replace function public.analytics_wilayas_order_agg(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  wilaya_id int,
  orders bigint,
  revenue_mad bigint
)
language sql
stable
as $$
  select
    o.wilaya_id,
    count(*)::bigint as orders,
    coalesce(sum(o.total_mad), 0)::bigint as revenue_mad
  from public.orders o
  where
    o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to
    and o.status not in ('cancelled', 'returned')
  group by o.wilaya_id;
$$;

create or replace function public.analytics_wilayas_event_agg(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  wilaya_id int,
  event_type text,
  events bigint
)
language sql
stable
as $$
  select
    e.wilaya_id,
    e.event_type::text,
    count(*)::bigint as events
  from public.analytics_events e
  where
    e.store_id = p_store_id
    and e.created_at >= p_from
    and e.created_at < p_to
    and e.wilaya_id is not null
  group by e.wilaya_id, e.event_type;
$$;

create index if not exists analytics_events_store_created_idx
  on public.analytics_events (store_id, created_at desc);

create index if not exists order_items_product_order_idx
  on public.order_items (product_id, order_id);
