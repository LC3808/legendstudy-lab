BEGIN;
DROP FUNCTION IF EXISTS public.admin_mobile_purchase_report(timestamptz,timestamptz,integer);
NOTIFY pgrst,'reload schema';
COMMIT;
