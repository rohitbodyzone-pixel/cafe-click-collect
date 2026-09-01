-- Fix feature permission category check constraint and RPC
begin;

alter table public.restaurant_feature_permissions
  drop constraint if exists restaurant_feature_permissions_category_check;

alter table public.restaurant_feature_permissions
  alter column category set default 'ordering';

create or replace function public.toggle_restaurant_feature_permission(
  p_restaurant_id uuid,
  p_feature_key text,
  p_enabled boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_category text := 'ordering';
begin
  -- Infer category from feature key prefix/type if possible
  if p_feature_key in ('rush_mode', 'kds_station_routing', 'inventory_tracking', 'receipt_printers', 'digital_checklists') then
    v_category := 'operations';
  elsif p_feature_key in ('loyalty_rewards', 'prepaid_passes', 'my_usual', 'review_shield', 'social_copywriter') then
    v_category := 'marketing';
  elsif p_feature_key in ('demand_prediction', 'health_score', 'menu_bcg_matrix', 'price_optimizer', 'ai_copilot') then
    v_category := 'ai_analytics';
  elsif p_feature_key in ('staff_roster', 'training_sops') then
    v_category := 'staff';
  end if;

  insert into public.restaurant_feature_permissions (restaurant_id, feature_key, category, is_enabled, updated_at)
  values (p_restaurant_id, p_feature_key, v_category, p_enabled, now())
  on conflict (restaurant_id, feature_key)
  do update set is_enabled = p_enabled, updated_at = now();

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'feature_key', p_feature_key,
    'is_enabled', p_enabled
  );
end;
$$;

commit;
