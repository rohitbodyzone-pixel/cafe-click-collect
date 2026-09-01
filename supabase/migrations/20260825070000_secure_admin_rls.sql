-- Lock every cafe-management write behind an authorized Supabase Auth staff email.
-- Customer reads and the existing secure order-placement RPCs remain available.

revoke all on public.cafe_staff from anon, authenticated;
grant select, insert, update, delete on public.cafe_staff to authenticated;
drop policy if exists "Staff can view staff" on public.cafe_staff;
create policy "Staff can view staff" on public.cafe_staff for select to authenticated using (public.is_cafe_staff());
drop policy if exists "Admins can add staff" on public.cafe_staff;
create policy "Admins can add staff" on public.cafe_staff for insert to authenticated with check (
  public.is_cafe_admin()
);
drop policy if exists "Admins can edit staff" on public.cafe_staff;
create policy "Admins can edit staff" on public.cafe_staff for update to authenticated using (
  public.is_cafe_admin()
) with check (true);
drop policy if exists "Admins can remove staff" on public.cafe_staff;
create policy "Admins can remove staff" on public.cafe_staff for delete to authenticated using (
  public.is_cafe_admin()
);

-- Products
drop policy if exists "Cafe staff can add menu items" on public.products;
drop policy if exists "Cafe staff can edit menu items" on public.products;
drop policy if exists "Cafe staff can delete menu items" on public.products;
revoke insert, update, delete on public.products from anon;
grant insert, update, delete on public.products to authenticated;
create policy "Authorized staff add menu items" on public.products for insert to authenticated with check (public.is_cafe_staff());
create policy "Authorized staff edit menu items" on public.products for update to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());
create policy "Authorized staff delete menu items" on public.products for delete to authenticated using (public.is_cafe_staff());

-- Pickup settings
drop policy if exists "Cafe staff can update pickup settings" on public.cafe_settings;
revoke update on public.cafe_settings from anon;
grant update on public.cafe_settings to authenticated;
create policy "Authorized staff update pickup settings" on public.cafe_settings for update to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());

-- Tables
drop policy if exists "Cafe staff can add tables" on public.cafe_tables;
drop policy if exists "Cafe staff can update tables" on public.cafe_tables;
drop policy if exists "Cafe staff can delete tables" on public.cafe_tables;
revoke insert, update, delete on public.cafe_tables from anon;
grant insert, update, delete on public.cafe_tables to authenticated;
create policy "Authorized staff add tables" on public.cafe_tables for insert to authenticated with check (public.is_cafe_staff());
create policy "Authorized staff update tables" on public.cafe_tables for update to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());
create policy "Authorized staff delete tables" on public.cafe_tables for delete to authenticated using (public.is_cafe_staff());

-- Customisations
drop policy if exists "Public customisation groups" on public.customisation_groups;
drop policy if exists "Public customisation options" on public.customisation_options;
drop policy if exists "Public product customisations" on public.product_customisation_groups;
revoke insert, update, delete on public.customisation_groups, public.customisation_options, public.product_customisation_groups from anon;
grant select on public.customisation_groups, public.customisation_options, public.product_customisation_groups to anon, authenticated;
grant insert, update, delete on public.customisation_groups, public.customisation_options, public.product_customisation_groups to authenticated;
create policy "Public read customisation groups" on public.customisation_groups for select to anon, authenticated using (true);
create policy "Staff manage customisation groups" on public.customisation_groups for all to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());
create policy "Public read customisation options" on public.customisation_options for select to anon, authenticated using (true);
create policy "Staff manage customisation options" on public.customisation_options for all to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());
create policy "Public read product customisations" on public.product_customisation_groups for select to anon, authenticated using (true);
create policy "Staff manage product customisations" on public.product_customisation_groups for all to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());

-- Loyalty and promos: customer-visible, staff-managed. Balances change only through reward RPCs.
drop policy if exists "Public loyalty settings" on public.loyalty_settings;
drop policy if exists "Public promo management" on public.promo_codes;
drop policy if exists "Customer loyalty access" on public.customer_loyalty;
revoke insert, update, delete on public.loyalty_settings, public.promo_codes, public.customer_loyalty from anon;
grant select on public.loyalty_settings, public.promo_codes, public.customer_loyalty to anon, authenticated;
grant insert, update, delete on public.loyalty_settings, public.promo_codes to authenticated;
create policy "Public read loyalty settings" on public.loyalty_settings for select to anon, authenticated using (true);
create policy "Staff manage loyalty settings" on public.loyalty_settings for all to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());
create policy "Public read enabled promos" on public.promo_codes for select to anon, authenticated using (enabled);
create policy "Staff read all promos" on public.promo_codes for select to authenticated using (public.is_cafe_staff());
create policy "Staff manage promos" on public.promo_codes for all to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());
create policy "Customers read loyalty balances" on public.customer_loyalty for select to anon, authenticated using (true);

-- Payment availability remains public; configuration is staff-only.
drop policy if exists "Cafe staff can update payment settings" on public.payment_settings;
revoke update on public.payment_settings from anon;
grant update on public.payment_settings to authenticated;
create policy "Authorized staff update payment settings" on public.payment_settings for update to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());

-- Only authorized staff can advance order status. Customer placement RPCs remain granted.
drop policy if exists "Cafe admin can update order status" on public.orders;
revoke update on public.orders from anon;
grant update (status) on public.orders to authenticated;
create policy "Authorized staff update order status" on public.orders for update to authenticated using (public.is_cafe_staff()) with check (public.is_cafe_staff());

grant select, insert on public.refund_requests to authenticated;
create policy "Staff view refund requests" on public.refund_requests for select to authenticated using (public.is_cafe_staff());
create policy "Staff request refunds" on public.refund_requests for insert to authenticated with check (public.is_cafe_staff());

-- Reward redemption is now an explicit customer checkout choice.
create or replace function public.finalize_cafe_rewards(
  p_order_id text, p_customer_key text, p_promo_code text, p_items jsonb,
  p_redeem_free_coffee boolean
) returns void language plpgsql security definer set search_path='' as $$
declare cfg public.loyalty_settings%rowtype; loyalty public.customer_loyalty%rowtype; promo public.promo_codes%rowtype;
subtotal integer; promo_discount integer:=0; free_discount integer:=0; final_total integer; earned integer:=0;
coffee_count integer:=0; new_stamps integer; new_free integer; redeemed integer:=0;
begin
  select * into cfg from public.loyalty_settings where id=1;
  insert into public.customer_loyalty(customer_key) values(p_customer_key) on conflict do nothing;
  select * into loyalty from public.customer_loyalty where customer_key=p_customer_key for update;
  select coalesce(sum((item->>'unit_price_cents')::integer*(item->>'quantity')::integer),0),
    coalesce(sum(case when coalesce((item->>'is_coffee')::boolean,false) then (item->>'quantity')::integer else 0 end),0)
    into subtotal,coffee_count from jsonb_array_elements(p_items)item;
  if p_promo_code is not null then
    select * into promo from public.promo_codes where upper(code)=upper(trim(p_promo_code)) and enabled=true
      and subtotal>=minimum_spend_cents and(expires_at is null or expires_at>=now());
    if found then promo_discount:=case when promo.discount_type='percent' then floor(subtotal*promo.discount_value/100) else promo.discount_value::integer end; end if;
  end if;
  if p_redeem_free_coffee and cfg.enabled and loyalty.free_coffees>0 and coffee_count>0 then
    select least(cfg.free_coffee_max_cents,min((item->>'unit_price_cents')::integer)) into free_discount
      from jsonb_array_elements(p_items)item where coalesce((item->>'is_coffee')::boolean,false);
    redeemed:=1;
  end if;
  final_total:=greatest(0,subtotal-promo_discount-free_discount);
  if cfg.enabled then
    earned:=floor((final_total/100.0)*cfg.points_per_dollar);
    new_stamps:=loyalty.coffee_stamps+coffee_count;
    new_free:=loyalty.free_coffees-redeemed+(new_stamps/cfg.coffee_goal);
    new_stamps:=mod(new_stamps,cfg.coffee_goal);
    update public.customer_loyalty set points=points+earned,coffee_stamps=new_stamps,free_coffees=new_free,updated_at=now() where customer_key=p_customer_key;
  end if;
  update public.orders set subtotal_cents=subtotal,discount_cents=least(subtotal,promo_discount+free_discount),
    promo_code=case when promo.id is null then null else promo.code end,free_coffee_discount_cents=free_discount,
    points_earned=earned,points_redeemed=redeemed,total_cents=final_total where id=p_order_id;
end $$;

create or replace function public.place_cafe_order(
  p_id text,p_customer_name text,p_phone text,p_pickup_time text,p_pickup_slot text,p_items jsonb,
  p_customer_key text,p_promo_code text,p_redeem_free_coffee boolean
) returns void language plpgsql security definer set search_path='' as $$
declare slot_limit integer;slot_count integer;
begin
  if p_pickup_slot is null or p_pickup_slot='' then raise exception 'Please select a pickup time'; end if;
  perform pg_advisory_xact_lock(hashtext(p_pickup_slot));
  select max_orders_per_slot into slot_limit from public.cafe_settings where id=1;
  select count(*) into slot_count from public.orders where pickup_slot=p_pickup_slot;
  if slot_count>=slot_limit then raise exception 'This pickup time has just filled up. Please choose another time.';end if;
  insert into public.orders(id,customer_name,phone,pickup_time,pickup_slot,total_cents,subtotal_cents,status,order_type,customer_key)
    values(p_id,p_customer_name,p_phone,p_pickup_time,p_pickup_slot,0,0,'Incoming','pickup',p_customer_key);
  perform public.insert_cafe_order_items(p_id,p_items);
  perform public.finalize_cafe_rewards(p_id,p_customer_key,p_promo_code,p_items,p_redeem_free_coffee);
end $$;

create or replace function public.place_table_order(
  p_id text,p_table_id uuid,p_order_notes text,p_items jsonb,p_customer_key text,p_promo_code text,
  p_redeem_free_coffee boolean
) returns void language plpgsql security definer set search_path='' as $$
declare selected_table public.cafe_tables%rowtype;
begin
  select * into selected_table from public.cafe_tables where id=p_table_id and active=true;
  if not found then raise exception 'This table is not available';end if;
  insert into public.orders(id,customer_name,phone,pickup_time,pickup_slot,total_cents,subtotal_cents,status,order_type,table_id,table_code,table_name,order_notes,customer_key)
    values(p_id,selected_table.display_name,'Table order','Table service',null,0,0,'Incoming','table',selected_table.id,selected_table.code,selected_table.display_name,nullif(trim(p_order_notes),''),p_customer_key);
  perform public.insert_cafe_order_items(p_id,p_items);
  perform public.finalize_cafe_rewards(p_id,p_customer_key,p_promo_code,p_items,p_redeem_free_coffee);
end $$;

revoke all on function public.place_cafe_order(text,text,text,text,text,jsonb,text,text,boolean) from public;
revoke all on function public.place_table_order(text,uuid,text,jsonb,text,text,boolean) from public;
grant execute on function public.place_cafe_order(text,text,text,text,text,jsonb,text,text,boolean) to anon,authenticated;
grant execute on function public.place_table_order(text,uuid,text,jsonb,text,text,boolean) to anon,authenticated;
