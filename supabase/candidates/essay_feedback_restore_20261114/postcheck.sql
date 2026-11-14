select p.proname,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'execute') anon,
 has_function_privilege('authenticated',p.oid,'execute') authenticated,
 has_function_privilege('service_role',p.oid,'execute') service_role
from pg_proc p where p.proname in ('essay_feedback_submit','essay_feedback_mine','admin_essay_feedback','admin_essay_feedback_update','admin_essay_feedback_result');
select relname,relrowsecurity from pg_class where relnamespace='feedback_private'::regnamespace and relkind='r';
