-- Preserve all identities and references; hide newly added answer on rollback.
BEGIN;
UPDATE public.resources SET is_active=false WHERE id='c8761509-f6d0-56d8-999c-16407683d7fd' AND source_resource_key='qDjj2/dJMcafISWxm';
UPDATE public.resources SET is_active=true WHERE id='78960745-ee6a-5045-842f-08738ac1fe44' AND source_resource_key='upcYM/dJMcafBoTJm';
COMMIT;
