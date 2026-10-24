-- Removes only the additive read. No records or existing functions change.
begin;
drop function public.admin_release_report(jsonb);
commit;
