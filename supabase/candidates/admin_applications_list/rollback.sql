-- Rollback admin_applications_list (new object only; nothing existing touched).
drop function if exists public.admin_applications_list(int);
