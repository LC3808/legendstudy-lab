-- Rollback admin_admission_outcomes (new object only; nothing existing touched).
drop function if exists public.admin_admission_outcomes(timestamptz,timestamptz);
