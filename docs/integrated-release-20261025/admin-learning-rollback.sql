BEGIN;
DROP FUNCTION IF EXISTS public.admin_learning_summary(uuid);
NOTIFY pgrst,'reload schema';
COMMIT;
