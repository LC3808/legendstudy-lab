-- Disable WEB tab / restore previous WEB first. No personal records or audit receipts deleted.
BEGIN;
DROP FUNCTION IF EXISTS public.admin_withdrawal_detail(uuid);
DROP FUNCTION IF EXISTS public.admin_withdrawal_list(text,text,text,integer,integer,jsonb);
COMMIT;
