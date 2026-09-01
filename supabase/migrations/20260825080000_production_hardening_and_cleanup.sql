-- One-time pre-production cleanup and privilege hardening.
-- This project has not accepted production orders yet; all orders before this
-- cutoff were created by the development regression suite.

begin;

-- Customer checkout must use the server-validated RPCs. Remove the legacy
-- direct-table paths left by early prototype migrations.
revoke insert on public.orders from anon, authenticated;
revoke insert on public.order_items from anon, authenticated;
revoke usage, select on sequence public.order_items_id_seq from anon, authenticated;

drop policy if exists "Customers can place cafe orders" on public.orders;
drop policy if exists "Customers can add cafe order items" on public.order_items;

-- Remove obsolete RPC overloads that accepted a client-supplied total.
drop function if exists public.place_cafe_order(text,text,text,text,text,integer,jsonb);
drop function if exists public.place_table_order(text,uuid,integer,text,jsonb);
drop function if exists public.place_cafe_order(text,text,text,text,text,jsonb,text,text);
drop function if exists public.place_table_order(text,uuid,text,jsonb,text,text);

-- First-admin bootstrap is no longer needed after the initial administrator
-- has been provisioned. Staff creation remains an authenticated admin task.
revoke all on function public.claim_first_cafe_admin() from public, anon, authenticated;

-- Remove known sandbox content and reset counters before launch.
delete from public.refund_requests;
delete from public.payment_attempts;
delete from public.orders where created_at < '2026-08-25 04:00:00+00';
delete from public.customer_loyalty;
delete from public.promo_codes where upper(code) = 'TEST10';
delete from public.products where lower(trim(name)) = 'burger';
update public.products set sold_out = false where sold_out = true;

commit;
