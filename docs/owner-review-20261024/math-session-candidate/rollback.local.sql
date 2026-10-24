-- Empty local candidate only. Refuse deleting any session history.
begin;
do $$begin
 if exists(select 1 from math_private.session_runs) or exists(select 1 from public.essay_billing_decisions where policy_key='essay-exam-cycle' and policy_version='math-session-v1') then raise exception 'NONEMPTY_MATH_SESSION_ROLLBACK_DENIED';end if;
 if exists(select 1 from math_private.session_function_backup b join pg_proc p on p.oid=b.signature::regprocedure where md5(pg_get_functiondef(p.oid))<>b.installed_hash or p.proowner<>b.owner_id or p.proacl::text is distinct from b.acl) then raise exception 'MATH_SESSION_FUNCTION_DRIFT';end if;
end$$;
grant essay_executor to postgres with admin false,inherit false,set true granted by postgres;
grant create on schema math_private to essay_executor;
grant select on math_private.session_function_backup to essay_executor;
create policy session_restore on math_private.session_function_backup for select to essay_executor using(true);
set role essay_executor;
do $$declare r record;begin for r in select definition from math_private.session_function_backup where owner_id=current_user::regrole loop execute r.definition;end loop;end$$;
reset role;
do $$declare r record;begin for r in select definition from math_private.session_function_backup where owner_id=current_user::regrole loop execute r.definition;end loop;end$$;
revoke create on schema math_private from essay_executor;
revoke essay_executor from postgres granted by postgres;
drop function public.math_session_submit(uuid,uuid,uuid[],uuid),public.math_session_read(uuid),public.math_session_retry(uuid,uuid),public.math_session_history();
drop table math_private.session_retries,math_private.session_evaluations,math_private.session_members,math_private.session_runs;
drop function math_private.session_reevaluation(uuid,uuid),math_private.session_eligibility(uuid,timestamptz),math_private.session_before_delete(),math_private.session_release(uuid,boolean),math_private.session_finance(uuid,text);
drop table math_private.session_function_backup;
commit;
