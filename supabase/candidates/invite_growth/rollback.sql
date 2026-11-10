-- Phase 3 invite_growth rollback. ONLY run after confirming no invite data must be preserved.
-- Removes only the NEW objects; no existing table/RPC is touched.
drop function if exists public.admin_invite_growth(timestamptz,timestamptz);
drop function if exists public.invite_my_performance();
drop function if exists public.invite_revoke_mine();
drop function if exists public.invite_refresh_milestones();
drop function if exists public.invite_mark_school_confirmed();
drop function if exists public.invite_attribute_signup(text);
drop function if exists public.invite_record_visit(text,text,text);
drop function if exists public.invite_lookup(text);
drop function if exists public.invite_create(text);
drop table if exists public.invite_attributions;
drop table if exists public.invite_visits;
drop table if exists public.invite_tokens;
