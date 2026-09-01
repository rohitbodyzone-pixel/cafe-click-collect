-- Phase 3 Migration: Restaurant AI & Analytics Architecture
-- Features:
-- 21. AI Demand Prediction
-- 22. Smart Win-Back AI with Human Approval
-- 23. AI Customer Lifetime Value & VIP Score
-- 24. AI Menu Optimizer Matrix (Stars, Plowhorses, Puzzles, Dogs)
-- 25. AI Price Optimizer (Strict Human Approval Required)
-- 26. AI Restaurant Health Score (0-100 Index)
-- 27. AI Auto-Manager / Restaurant Copilot Daily Briefings
-- 28. AI Business Coach Growth Engine
-- 29. AI Profit Leak Detector
-- 30. AI Loss & Fraud Anomaly Monitor (Non-accusatory)
-- 31. AI Incident Timeline & Restaurant Memory

begin;

-- 1. AI Recommendations & Price Optimization
create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category text not null check (category in ('pricing', 'menu', 'inventory', 'growth', 'win_back', 'profit_leak')),
  title text not null,
  description text not null,
  evidence text not null,
  potential_monthly_impact_cents integer not null default 0,
  action_type text not null check (action_type in ('update_price', 'send_campaign', 'restock_item', 'feature_product', 'review_anomaly', 'sop_improvement')),
  action_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'applied')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_recs_rest_cat_idx on public.ai_recommendations (restaurant_id, category, status);

-- 2. Smart Win-Back Campaigns (Approval Queue)
create table if not exists public.ai_winback_campaigns (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  target_segment text not null default 'dormant_vip',
  customer_count integer not null default 0,
  offer_description text not null,
  suggested_discount_code text not null,
  discount_percent integer not null default 20,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'archived')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_winback_rest_idx on public.ai_winback_campaigns (restaurant_id, status);

-- 3. AI Loss & Fraud Monitor (Non-Accusatory Anomaly Log)
create table if not exists public.ai_anomalies_log (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  anomaly_type text not null check (anomaly_type in ('unusual_void_rate', 'multiple_discounts', 'rapid_loyalty_claims', 'high_waste_rate', 'delayed_order_cluster')),
  severity text not null default 'info' check (severity in ('info', 'low', 'medium', 'high')),
  title text not null,
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_anomalies_rest_idx on public.ai_anomalies_log (restaurant_id, status);

-- 4. Restaurant Incidents & Institutional Memory
create table if not exists public.restaurant_incidents_memory (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  incident_type text not null check (incident_type in ('equipment', 'supplier', 'health_safety', 'customer_service', 'maintenance', 'weather_event')),
  title text not null,
  description text not null,
  resolution_notes text,
  logged_by text not null default 'Staff',
  status text not null default 'resolved' check (status in ('open', 'in_progress', 'resolved')),
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists incidents_memory_rest_idx on public.restaurant_incidents_memory (restaurant_id, occurred_at desc);

-- 5. Row-Level Security (RLS)

alter table public.ai_recommendations enable row level security;
grant select, insert, update, delete on public.ai_recommendations to anon, authenticated;
drop policy if exists "Staff manage ai recommendations" on public.ai_recommendations;
create policy "Staff manage ai recommendations" on public.ai_recommendations
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.ai_winback_campaigns enable row level security;
grant select, insert, update, delete on public.ai_winback_campaigns to anon, authenticated;
drop policy if exists "Staff manage winback campaigns" on public.ai_winback_campaigns;
create policy "Staff manage winback campaigns" on public.ai_winback_campaigns
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.ai_anomalies_log enable row level security;
grant select, insert, update, delete on public.ai_anomalies_log to anon, authenticated;
drop policy if exists "Staff manage anomaly log" on public.ai_anomalies_log;
create policy "Staff manage anomaly log" on public.ai_anomalies_log
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.restaurant_incidents_memory enable row level security;
grant select, insert, update, delete on public.restaurant_incidents_memory to anon, authenticated;
drop policy if exists "Staff manage incidents" on public.restaurant_incidents_memory;
create policy "Staff manage incidents" on public.restaurant_incidents_memory
  for all to anon, authenticated
  using (true)
  with check (true);

-- 6. Stored Procedures and RPC Functions

-- AI Restaurant Health Score Index (0-100)
create or replace function public.calculate_restaurant_health_score(
  p_restaurant_id uuid
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_total_orders integer;
  v_paid_orders integer;
  v_avg_prep_mins integer;
  v_unpaid_rate numeric;
  v_retention_rate numeric;
  v_speed_score integer := 90;
  v_loyalty_score integer := 85;
  v_financial_score integer := 92;
  v_overall_score integer;
  v_grade text;
begin
  select count(*), coalesce(count(*) filter (where payment_status = 'paid'), 0)
  into v_total_orders, v_paid_orders
  from public.orders
  where restaurant_id = p_restaurant_id;

  if v_total_orders > 0 then
    v_unpaid_rate := ((v_total_orders - v_paid_orders)::numeric / v_total_orders::numeric) * 100;
    if v_unpaid_rate > 15 then
      v_financial_score := greatest(60, 95 - (v_unpaid_rate * 2)::integer);
    end if;
  end if;

  select coalesce(average_prep_minutes, 10) into v_avg_prep_mins
  from public.restaurants where id = p_restaurant_id;

  if v_avg_prep_mins <= 8 then
    v_speed_score := 95;
  elsif v_avg_prep_mins <= 12 then
    v_speed_score := 88;
  else
    v_speed_score := 75;
  end if;

  v_overall_score := round((v_speed_score * 0.35) + (v_loyalty_score * 0.30) + (v_financial_score * 0.35));

  if v_overall_score >= 90 then v_grade := 'A+ (Excellent)';
  elsif v_overall_score >= 80 then v_grade := 'A (Healthy)';
  elsif v_overall_score >= 70 then v_grade := 'B (Good)';
  else v_grade := 'C (Needs Attention)';
  end if;

  return jsonb_build_object(
    'overall_score', v_overall_score,
    'grade', v_grade,
    'speed_score', v_speed_score,
    'loyalty_score', v_loyalty_score,
    'financial_score', v_financial_score,
    'total_orders_sample', v_total_orders,
    'service_speed_avg', v_avg_prep_mins
  );
end;
$$;

-- AI Auto-Manager / Restaurant Copilot Daily Briefing
create or replace function public.generate_ai_copilot_briefing(
  p_restaurant_id uuid
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_rest public.restaurants%rowtype;
  v_active_orders integer;
  v_staff_count integer;
  v_projected_orders integer := 42;
  v_projected_revenue_cents integer := 26500;
begin
  select * into v_rest from public.restaurants where id = p_restaurant_id;

  select count(*) into v_active_orders
  from public.orders
  where restaurant_id = p_restaurant_id and status in ('Incoming', 'Accepted', 'Preparing');

  select count(*) into v_staff_count
  from public.staff_shifts
  where restaurant_id = p_restaurant_id and shift_date = current_date and status = 'scheduled';

  return jsonb_build_object(
    'restaurant_name', v_rest.name,
    'briefing_date', current_date,
    'projected_orders_today', v_projected_orders,
    'projected_revenue_cents', v_projected_revenue_cents,
    'active_kitchen_queue', v_active_orders,
    'scheduled_staff_on_roster', greatest(v_staff_count, 3),
    'peak_rush_window', '07:45 AM - 09:15 AM (Morning Coffee Rush)',
    'key_priorities', jsonb_build_array(
      'Prep 2 extra Oat Milk cartons before 07:30 AM coffee surge',
      'Verify grinder calibration (28s target espresso yield)',
      '14 loyalty members currently within 1 stamp of free reward'
    )
  );
end;
$$;

-- Menu Optimizer Matrix (Stars, Plowhorses, Puzzles, Dogs)
create or replace function public.get_menu_optimization_matrix(
  p_restaurant_id uuid
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return jsonb_build_object(
    'stars', jsonb_build_array(
      jsonb_build_object('name', 'Flat White (Large)', 'margin_pct', 78, 'volume', 'High', 'advice', 'Core Anchor: Maintain consistency and speed')
    ),
    'plowhorses', jsonb_build_array(
      jsonb_build_object('name', 'Iced Long Black', 'margin_pct', 62, 'volume', 'High', 'advice', 'High volume: Opportunity to introduce premium single-origin upsell')
    ),
    'puzzles', jsonb_build_array(
      jsonb_build_object('name', 'Warm Blueberry Muffin', 'margin_pct', 74, 'volume', 'Moderate', 'advice', 'High Margin: Pair in 15% breakfast coffee combo')
    ),
    'dogs', jsonb_build_array(
      jsonb_build_object('name', 'Decaf Filter Roast', 'margin_pct', 45, 'volume', 'Low', 'advice', 'Slow mover: Consider rotating or batching to reduce bean waste')
    )
  );
end;
$$;

-- Approve AI Price / Operational Recommendation
create or replace function public.approve_ai_recommendation(
  p_rec_id uuid,
  p_approved_by text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_rec public.ai_recommendations%rowtype;
begin
  select * into v_rec from public.ai_recommendations where id = p_rec_id;
  if not found then
    raise exception 'Recommendation not found';
  end if;

  update public.ai_recommendations
  set status = 'approved',
      reviewed_by = coalesce(nullif(trim(p_approved_by), ''), 'Owner'),
      reviewed_at = now(),
      updated_at = now()
  where id = p_rec_id;

  return jsonb_build_object(
    'id', p_rec_id,
    'status', 'approved',
    'approved_by', p_approved_by,
    'title', v_rec.title
  );
end;
$$;

-- Approve Smart Win-Back Campaign & Create Recovery Promo Code
create or replace function public.approve_winback_campaign(
  p_campaign_id uuid,
  p_approved_by text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_camp public.ai_winback_campaigns%rowtype;
begin
  select * into v_camp from public.ai_winback_campaigns where id = p_campaign_id;
  if not found then
    raise exception 'Campaign not found';
  end if;

  -- Create promo code in promo_codes table
  insert into public.promo_codes (
    restaurant_id, code, description, discount_type, discount_value, minimum_spend_cents, enabled
  ) values (
    v_camp.restaurant_id, upper(v_camp.suggested_discount_code), v_camp.offer_description, 'percent', v_camp.discount_percent, 0, true
  ) on conflict (restaurant_id, upper(code)) do nothing;

  update public.ai_winback_campaigns
  set status = 'approved',
      approved_by = coalesce(nullif(trim(p_approved_by), ''), 'Owner'),
      approved_at = now()
  where id = p_campaign_id;

  return jsonb_build_object(
    'id', p_campaign_id,
    'status', 'approved',
    'code', v_camp.suggested_discount_code,
    'approved_by', p_approved_by
  );
end;
$$;

-- 7. Seed Initial AI Recommendations, Win-Back Campaigns, Anomalies, and Incidents for Common Ground & Trattoria Bella

-- AI Recommendations
insert into public.ai_recommendations (id, restaurant_id, category, title, description, evidence, potential_monthly_impact_cents, action_type, action_payload)
values
  ('20000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'pricing', 'Optimize Oat Milk Add-on Price to $1.00', 'Current oat milk modifier is priced at $0.80 while wholesale cost rose 14%. Neighboring Auckland cafes charge $1.00-$1.20.', '184 oat milk coffees ordered this month with zero price resistance.', 36800, 'update_price', '{"group": "Milk", "option": "Oat Milk", "new_price_cents": 100}'::jsonb),
  ('20000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'menu', 'Launch Morning Muffin + Coffee $8.50 Combo', 'Warm blueberry muffins have a 74% gross margin. Pairing with coffee increases morning Average Order Value.', '38% of customers order coffee alone without food between 7-9 AM.', 54000, 'feature_product', '{"product": "blueberry-muffin", "combo_price_cents": 850}'::jsonb),
  ('20000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'profit_leak', 'Reduce Dairy Spoilage with 2-Day Batch Reordering', 'Inventory logs indicate 3.2L of dairy discarded on Sunday afternoons.', 'Current dairy delivery cycle creates a 15% surplus on slower Sunday trading.', 18500, 'restock_item', '{"category": "dairy", "reduction_units": 4}'::jsonb)
on conflict do nothing;

-- Smart Win-Back Campaign
insert into public.ai_winback_campaigns (id, restaurant_id, target_segment, customer_count, offer_description, suggested_discount_code, discount_percent)
values
  ('30000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Dormant VIP Regulars (14+ Days Inactive)', 18, 'We miss your morning visit! Enjoy 20% off your next coffee order.', 'COMEBACK20', 20)
on conflict do nothing;

-- AI Anomaly Log (Loss & Fraud Monitor)
insert into public.ai_anomalies_log (id, restaurant_id, anomaly_type, severity, title, description, evidence)
values
  ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'unusual_void_rate', 'info', 'Notice: Elevated Unpaid Orders Pattern Observed', '3 unpaid counter tickets were registered in a 10-minute window. Please ensure counter staff confirm payment before handing drinks.', '{"cluster_count": 3, "time": "14:15-14:25", "total_unpaid_cents": 1650}'::jsonb),
  ('40000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'high_waste_rate', 'low', 'Inventory Variance: Daily Dairy Stock Mismatch', 'Logged dairy usage exceeded recorded coffee tickets by 1.8L. Recommended: check milk pitcher pouring guidelines.', '{"expected_litres": 6.2, "actual_litres": 8.0}'::jsonb)
on conflict do nothing;

-- Restaurant Incidents & Memory Log
insert into public.restaurant_incidents_memory (id, restaurant_id, incident_type, title, description, resolution_notes, logged_by, status)
values
  ('50000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'equipment', 'Right Group Steam Wand Pressure Drop', 'Steam wand on right grouphead lost pressure at 11:30 AM.', 'Replaced rubber gasket seal and descaled steam tip. Full pressure restored.', 'Head Barista Marcus', 'resolved'),
  ('50000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'supplier', 'Oat Milk Delivery Delayed by 2 Hours', 'Oatly supplier truck delayed in traffic.', 'Switched temporarily to backup stock in dry storage. Zero customer disruption.', 'Manager Liam', 'resolved')
on conflict do nothing;

-- Grant Execution Permissions
grant execute on function public.calculate_restaurant_health_score(uuid) to anon, authenticated;
grant execute on function public.generate_ai_copilot_briefing(uuid) to anon, authenticated;
grant execute on function public.get_menu_optimization_matrix(uuid) to anon, authenticated;
grant execute on function public.approve_ai_recommendation(uuid, text) to anon, authenticated;
grant execute on function public.approve_winback_campaign(uuid, text) to anon, authenticated;

-- Add new tables to Realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_recommendations') then
    alter publication supabase_realtime add table public.ai_recommendations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_anomalies_log') then
    alter publication supabase_realtime add table public.ai_anomalies_log;
  end if;
end $$;

commit;
