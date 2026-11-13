begin;
revoke execute on function public.admin_learning_rankings_page(timestamptz,timestamptz,text,integer,integer,text) from authenticated;
commit;
-- Restore previous WEB deployment; retain all user data.
