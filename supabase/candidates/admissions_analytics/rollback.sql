-- Rollback admin_admissions_analytics (new object only; nothing existing touched).
drop function if exists public.admin_admissions_analytics(timestamptz,timestamptz);
