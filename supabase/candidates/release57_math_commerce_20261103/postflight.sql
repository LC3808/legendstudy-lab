-- Read-only catalog postflight. Does not invoke an evaluation, issue credits, or inspect student work.
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,
 pg_get_userbyid(p.proowner) owner,p.proacl::text acl,p.prosecdef,p.proconfig,
 md5(pg_get_functiondef(p.oid)) definition_md5
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname in('math_coaching','essay_math_coaching','math_session_quote','math_session_continue','math_session_quote_source','math_session_continue_source','math_session_submit','math_catalog','math_session_read','math_learning','math_evaluation_detail','math_reveal_hint','essay_exam_history'))
 or (n.nspname='math_private' and p.proname in('cycle_deadline','authorize_billing','learning_eligibility','session_eligibility','evaluation_admission'))  or (n.nspname='essay_beta_private' and p.proname in('eligible','credit_source')) order by n.nspname,p.proname;
select pg_get_userbyid(roleid) role,pg_get_userbyid(member) member,pg_get_userbyid(grantor) grantor,admin_option,inherit_option,set_option
from pg_auth_members where roleid in('math_executor'::regrole,'essay_executor'::regrole) and member='postgres'::regrole;
select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.oid in('math_private.coaching_disclosures'::regclass,'math_private.mixed_coaching_disclosures'::regclass,'math_private.mixed_coaching_hints'::regclass);
select p.oid::regprocedure raw_endpoint,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,
 has_function_privilege('anon',p.oid,'EXECUTE') anon,
 has_function_privilege('service_role',p.oid,'EXECUTE') service_role
from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in('math_evaluation_detail_task16f_legacy','math_reveal_hint_task16f_legacy','math_learning_task16f_legacy','math_session_read_before_task16g','essay_exam_history_before_task16g','math_coaching_before_task16g');

-- Configuration only; no account/student/grant contents.
select id,starts_on,ends_on,enabled,daily_limit,policy_version from essay_beta_private.campaigns;
select campaign_id,exam_id,has_math,question_ids,owner_math_qa_reference,approval_reference from essay_beta_private.exam_scope order by exam_id;
