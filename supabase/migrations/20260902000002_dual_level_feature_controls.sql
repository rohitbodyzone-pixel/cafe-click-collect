-- Migration: Complete Dual-Level Feature Control System (58 Optional Features)
begin;

-- 1. Upgrade restaurant_feature_permissions table columns
alter table public.restaurant_feature_permissions
  add column if not exists super_admin_enabled boolean not null default true,
  add column if not exists owner_enabled boolean not null default true,
  add column if not exists updated_by text default 'system';

-- Sync super_admin_enabled with existing is_enabled data
update public.restaurant_feature_permissions
set super_admin_enabled = is_enabled
where super_admin_enabled is distinct from is_enabled;

-- 2. Enhanced Dual-Level Single Toggle RPC
create or replace function public.toggle_restaurant_feature_permission(
  p_restaurant_id uuid,
  p_feature_key text,
  p_enabled boolean,
  p_level text default 'super_admin'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_category text := 'ordering';
  v_current_super boolean := true;
  v_current_owner boolean := true;
  v_effective boolean := true;
begin
  -- Infer category
  if p_feature_key in ('rush_mode', 'kds_station_routing', 'inventory_tracking', 'receipt_printers', 'digital_checklists', 'pos_integrations', 'offline_mode', 'wait_balancer', 'universal_qr_posters', 'menu_versioning', 'kds_reopen_workflow') then
    v_category := 'operations';
  elsif p_feature_key in ('loyalty_rewards', 'prepaid_passes', 'my_usual', 'review_shield', 'social_copywriter', 'combo_suggestions', 'digital_wallet_passes', 'vip_customer_tiers', 'auto_refill_reminders', 'push_notifications', 'customer_arrival_alert', 'influencer_hub', 'weather_campaigns') then
    v_category := 'marketing';
  elsif p_feature_key in ('demand_prediction', 'health_score', 'menu_bcg_matrix', 'price_optimizer', 'ai_copilot', 'win_back_ai', 'customer_clv', 'food_waste_monitor', 'sound_alerts', 'kds_ai_optimization', 'restaurant_memory', 'review_responder', 'pairing_concierge', 'delivery_dispatcher', 'customer_auto_tagger', 'dynamic_pricing', 'franchise_playbook', 'competitor_price_spy', 'menu_description_generator', 'kds_sla_timers', 'supplier_purchase_orders') then
    v_category := 'ai_analytics';
  elsif p_feature_key in ('staff_roster', 'training_sops', 'sales_analytics') then
    v_category := 'staff';
  end if;

  -- Read current record if exists
  select super_admin_enabled, owner_enabled into v_current_super, v_current_owner
  from public.restaurant_feature_permissions
  where restaurant_id = p_restaurant_id and feature_key = p_feature_key;

  if not found then
    v_current_super := true;
    v_current_owner := true;
  end if;

  if p_level = 'super_admin' then
    v_current_super := p_enabled;
  elsif p_level = 'owner' then
    -- If Super Admin has disabled this feature, owner cannot enable it
    if not v_current_super and p_enabled then
      raise exception 'Cannot enable feature "%" because it is disabled by Platform Super Admin.', p_feature_key;
    end if;
    v_current_owner := p_enabled;
  else
    raise exception 'Invalid permission level "%". Must be "super_admin" or "owner".', p_level;
  end if;

  v_effective := (v_current_super and v_current_owner);

  insert into public.restaurant_feature_permissions (
    restaurant_id, feature_key, category, is_enabled, super_admin_enabled, owner_enabled, updated_by, updated_at
  )
  values (
    p_restaurant_id, p_feature_key, v_category, v_effective, v_current_super, v_current_owner, p_level, now()
  )
  on conflict (restaurant_id, feature_key)
  do update set
    super_admin_enabled = v_current_super,
    owner_enabled = v_current_owner,
    is_enabled = v_effective,
    category = v_category,
    updated_by = p_level,
    updated_at = now();

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'feature_key', p_feature_key,
    'super_admin_enabled', v_current_super,
    'owner_enabled', v_current_owner,
    'effective_enabled', v_effective,
    'level', p_level
  );
end;
$$;

-- 3. Enhanced Dual-Level Bulk Category Toggle RPC
create or replace function public.bulk_toggle_restaurant_features(
  p_restaurant_id uuid,
  p_category text,
  p_enabled boolean,
  p_level text default 'super_admin'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_level = 'super_admin' then
    update public.restaurant_feature_permissions
    set super_admin_enabled = p_enabled,
        is_enabled = (p_enabled and owner_enabled),
        updated_by = 'super_admin',
        updated_at = now()
    where restaurant_id = p_restaurant_id and category = p_category;
  elsif p_level = 'owner' then
    update public.restaurant_feature_permissions
    set owner_enabled = case when super_admin_enabled then p_enabled else false end,
        is_enabled = case when super_admin_enabled then p_enabled else false end,
        updated_by = 'owner',
        updated_at = now()
    where restaurant_id = p_restaurant_id and category = p_category;
  else
    raise exception 'Invalid level "%"', p_level;
  end if;

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'category', p_category,
    'enabled', p_enabled,
    'level', p_level
  );
end;
$$;

-- 4. Fast Single-Query Effective Permissions Matrix RPC
create or replace function public.get_restaurant_effective_features(
  p_restaurant_id uuid
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb := '{}'::jsonb;
  r record;
begin
  for r in
    select feature_key, super_admin_enabled, owner_enabled, is_enabled
    from public.restaurant_feature_permissions
    where restaurant_id = p_restaurant_id
  loop
    v_result := jsonb_set(
      v_result,
      array[r.feature_key],
      jsonb_build_object(
        'super_admin', r.super_admin_enabled,
        'owner', r.owner_enabled,
        'effective', (r.super_admin_enabled and r.owner_enabled)
      )
    );
  end loop;

  return v_result;
end;
$$;

grant execute on function public.toggle_restaurant_feature_permission(uuid, text, boolean, text) to anon, authenticated;
grant execute on function public.bulk_toggle_restaurant_features(uuid, text, boolean, text) to anon, authenticated;
grant execute on function public.get_restaurant_effective_features(uuid) to anon, authenticated;

-- 5. Seed All 58 Features for active restaurants
do $$
declare
  v_rest record;
  v_features text[] := array[
    -- Ordering (10)
    'click_and_collect', 'table_ordering', 'pay_at_counter', 'group_ordering', 'curbside_pickup',
    'live_queue_tracking', 'smart_pickup_timing', 'table_service_calls', 'multi_channel_concierge', 'voice_phone_assistant',
    -- Operations (11)
    'rush_mode', 'kds_station_routing', 'inventory_tracking', 'receipt_printers', 'digital_checklists',
    'pos_integrations', 'offline_mode', 'wait_balancer', 'universal_qr_posters', 'menu_versioning', 'kds_reopen_workflow',
    -- Marketing (13)
    'loyalty_rewards', 'prepaid_passes', 'my_usual', 'review_shield', 'social_copywriter',
    'combo_suggestions', 'digital_wallet_passes', 'vip_customer_tiers', 'auto_refill_reminders', 'push_notifications',
    'customer_arrival_alert', 'influencer_hub', 'weather_campaigns',
    -- AI Analytics (21)
    'demand_prediction', 'health_score', 'menu_bcg_matrix', 'price_optimizer', 'ai_copilot',
    'win_back_ai', 'customer_clv', 'food_waste_monitor', 'sound_alerts', 'kds_ai_optimization',
    'restaurant_memory', 'review_responder', 'pairing_concierge', 'delivery_dispatcher', 'customer_auto_tagger',
    'dynamic_pricing', 'franchise_playbook', 'competitor_price_spy', 'menu_description_generator', 'kds_sla_timers', 'supplier_purchase_orders',
    -- Staff (3)
    'staff_roster', 'training_sops', 'sales_analytics'
  ];
  v_feat text;
  v_cat text;
begin
  for v_rest in select id from public.restaurants loop
    foreach v_feat in array v_features loop
      if v_feat in ('rush_mode', 'kds_station_routing', 'inventory_tracking', 'receipt_printers', 'digital_checklists', 'pos_integrations', 'offline_mode', 'wait_balancer', 'universal_qr_posters', 'menu_versioning', 'kds_reopen_workflow') then
        v_cat := 'operations';
      elsif v_feat in ('loyalty_rewards', 'prepaid_passes', 'my_usual', 'review_shield', 'social_copywriter', 'combo_suggestions', 'digital_wallet_passes', 'vip_customer_tiers', 'auto_refill_reminders', 'push_notifications', 'customer_arrival_alert', 'influencer_hub', 'weather_campaigns') then
        v_cat := 'marketing';
      elsif v_feat in ('demand_prediction', 'health_score', 'menu_bcg_matrix', 'price_optimizer', 'ai_copilot', 'win_back_ai', 'customer_clv', 'food_waste_monitor', 'sound_alerts', 'kds_ai_optimization', 'restaurant_memory', 'review_responder', 'pairing_concierge', 'delivery_dispatcher', 'customer_auto_tagger', 'dynamic_pricing', 'franchise_playbook', 'competitor_price_spy', 'menu_description_generator', 'kds_sla_timers', 'supplier_purchase_orders') then
        v_cat := 'ai_analytics';
      elsif v_feat in ('staff_roster', 'training_sops', 'sales_analytics') then
        v_cat := 'staff';
      else
        v_cat := 'ordering';
      end if;

      insert into public.restaurant_feature_permissions (
        restaurant_id, feature_key, category, is_enabled, super_admin_enabled, owner_enabled, updated_by
      )
      values (
        v_rest.id, v_feat, v_cat, true, true, true, 'system_seed'
      )
      on conflict (restaurant_id, feature_key)
      do update set
        category = v_cat,
        super_admin_enabled = coalesce(restaurant_feature_permissions.super_admin_enabled, true),
        owner_enabled = coalesce(restaurant_feature_permissions.owner_enabled, true),
        is_enabled = (coalesce(restaurant_feature_permissions.super_admin_enabled, true) and coalesce(restaurant_feature_permissions.owner_enabled, true));
    end loop;
  end loop;
end $$;

commit;
