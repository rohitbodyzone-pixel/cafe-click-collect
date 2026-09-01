-- Drop overloaded 3-argument function signatures to avoid PostgreSQL RPC ambiguity
begin;

drop function if exists public.toggle_restaurant_feature_permission(uuid, text, boolean);
drop function if exists public.bulk_toggle_restaurant_features(uuid, text, boolean);

commit;
