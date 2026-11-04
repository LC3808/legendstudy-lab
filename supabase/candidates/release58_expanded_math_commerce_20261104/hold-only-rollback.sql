-- Emergency HOLD only; execute only with Owner authorization for the target environment.
-- Retain masking wrappers, hint/disclosure records, all existing/new attempts, History and Ledger.
-- Never run the historical F rollback: it reopens raw answer endpoints.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$begin
 if to_regprocedure('public.math_coaching(jsonb)') is null
  or to_regclass('math_private.coaching_disclosures') is null then
  raise exception 'RELEASE57_COACHING_NOT_INSTALLED';end if;
end$$;
update math_private.runtime_control set evaluations_enabled=false where singleton;
-- Do not disable Essay-wide runtime or alter credit ledger/beta grants.
commit;
-- Also HOLD expansion-only WEB/APP scope: disable expansion activation flags/remove expansion
-- IDs from the deployment allowlist. Preserve original humanities IDs and existing history routes.
-- MATH_ENABLED=false and MATH_PROVIDER_CALLS_ENABLED=false stop new dispatch, but do not erase secrets.
