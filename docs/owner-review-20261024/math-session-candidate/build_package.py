"""Build guarded LOCAL candidate from Owner-verified legacy definitions.
No remote access. Promotion to Owner executable package requires full validation.
"""
from pathlib import Path
import re, hashlib
ROOT=Path(__file__).resolve().parent
APP=Path('/Users/woojinchang/development/legendstudy-service-app-20261022')
source=(APP/'supabase/migrations/20261002000100_math_essay_persistence.sql').read_text()
names=['authorize_billing','settle_billing','release_billing']
checks=[];definitions=[]
for name,action in zip(names,['authorize','settle','release']):
 definition=re.search(r'create or replace function math_private\.'+name+r'\(uuid\).*?end\$math_fn\$;',source,re.S).group()
 body=definition.split('as $math_fn$',1)[1].rsplit('$math_fn$;',1)[0]
 digest=hashlib.md5(re.sub(r'\s','',body).encode()).hexdigest()
 checks.append(f"if not exists(select 1 from pg_proc where oid='math_private.{name}(uuid)'::regprocedure and proowner='essay_executor'::regrole and md5(regexp_replace(prosrc,'[[:space:]]','','g'))='{digest}') then raise exception 'UNEXPECTED_{name.upper()}';end if;")
 if action=='authorize':hook="\n decision=math_private.session_finance($1,'authorize'); if decision is not null then return decision;end if;"
 else:hook="\n if math_private.session_finance($1,'"+action+"') is not null then return;end if;"
 definitions.append(definition.replace('begin','begin'+hook,1))
learning=(APP/'supabase/migrations/20261002000300_math_learning_runtime.sql').read_text()
public_definitions=[]
for schema,name in [('public','math_learning'),('math_private','learning_eligibility')]:
 definition=re.search(r'create (?:or replace )?function '+schema+r'\.'+name+r'\(.*?end\$[a-z_]*\$;',learning,re.S).group()
 definition=definition.replace('create function','create or replace function',1)
 delimiter=re.search(r'as (\$[a-z_]*\$)',definition).group(1)
 body=definition.split('as '+delimiter,1)[1].rsplit(delimiter+';',1)[0]
 digest=hashlib.md5(re.sub(r'\s','',body).encode()).hexdigest()
 signature=schema+'.'+name+('(jsonb)' if name=='math_learning' else '(uuid,timestamptz)')
 checks.append(f"if not exists(select 1 from pg_proc where oid='{signature}'::regprocedure and proowner='postgres'::regrole and md5(regexp_replace(prosrc,'[[:space:]]','','g'))='{digest}') then raise exception 'UNEXPECTED_{name.upper()}';end if;")
 if name=='learning_eligibility':
  definition=definition.replace('begin',"begin\n if math_private.session_eligibility($1,$2) is not null then return math_private.session_eligibility($1,$2);end if;",1)
 else:
  old="newid=public.math_request_evaluation(a.id,(v->>'client_submission_id')::uuid);"
  assert old in definition
  definition=definition.replace(old,"newid=coalesce(math_private.session_reevaluation(a.id,(v->>'client_submission_id')::uuid),public.math_request_evaluation(a.id,(v->>'client_submission_id')::uuid));")
  old="select d.* into decision from public.essay_billing_decisions d join public.math_billing_bindings b on b.billing_decision_id=d.id where b.math_evaluation_id=newid;"
  assert old in definition
  definition=definition.replace(old,"select d.* into decision from public.essay_billing_decisions d where d.id in (select billing_decision_id from public.math_billing_bindings where math_evaluation_id=newid union all select sr.decision_id from math_private.session_evaluations x join math_private.session_members sm on sm.attempt_id=x.attempt_id join math_private.session_runs sr on sr.id=sm.run_id where x.evaluation_id=newid);")
 public_definitions.append(definition)
header="""-- LOCAL CANDIDATE: not approved for Production execution.
begin;
do $$begin
 if current_user<>'postgres' or (select rolsuper from pg_roles where rolname=current_user) then raise exception 'NON_SUPERUSER_POSTGRES_REQUIRED';end if;
 if has_schema_privilege('essay_executor','math_private','CREATE') or exists(select 1 from pg_auth_members where roleid='essay_executor'::regrole and member='postgres'::regrole and (inherit_option or set_option)) then raise exception 'UNEXPECTED_OWNER_TOPOLOGY';end if;
"""+'\n'.join(checks)+"\nend$$;\n"
backup="""create table math_private.session_function_backup(signature text primary key,definition text not null,owner_id oid not null,acl text,installed_hash text);
alter table math_private.session_function_backup enable row level security;
revoke all on math_private.session_function_backup from public,anon,authenticated,service_role;
insert into math_private.session_function_backup(signature,definition,owner_id,acl)
select p.oid::regprocedure::text,pg_get_functiondef(p.oid),p.proowner,p.proacl::text from pg_proc p where p.oid=any(array[
'math_private.authorize_billing(uuid)'::regprocedure,'math_private.settle_billing(uuid)'::regprocedure,'math_private.release_billing(uuid)'::regprocedure,'public.math_learning(jsonb)'::regprocedure,'math_private.learning_eligibility(uuid,timestamptz)'::regprocedure]);
"""
install=header+backup+(ROOT/'core.sql').read_text()+"""
grant essay_executor to postgres with admin false,inherit false,set true granted by postgres;
grant create on schema math_private to essay_executor;
set role essay_executor;
"""+'\n'.join(definitions)+"""
reset role;
"""+'\n'.join(public_definitions)+"""
revoke create on schema math_private from essay_executor;
revoke essay_executor from postgres granted by postgres;
update math_private.session_function_backup b set installed_hash=md5(pg_get_functiondef(b.signature::regprocedure));
-- CREATE OR REPLACE must preserve every pre-existing ACL and owner, including
-- the Production-only postgres EXECUTE grant on release_billing.
do $$begin
 if exists(select 1 from math_private.session_function_backup b join pg_proc p on p.oid=b.signature::regprocedure where p.proowner<>b.owner_id or p.proacl::text is distinct from b.acl) then raise exception 'OWNER_ACL_CHANGED';end if;
end$$;
commit;
"""
(ROOT/'install.local.sql').write_text(install)
rollback="""-- Empty local candidate only. Refuse deleting any session history.
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
"""
(ROOT/'rollback.local.sql').write_text(rollback)
print('Generated local guarded install/rollback. NOT Production-ready.')
