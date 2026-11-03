-- LegendStudy release57: incremental coaching/disclosure/continuation only.
-- Candidate: NOT APPLIED to Production. No seed, grants issuance, catalog replacement, or legacy fact UPDATE.
-- Sources: existing tested F/G candidates + exact 2026-11-03 production catalog hashes.
-- PostgreSQL17 non-superuser postgres; original Supabase admin memberships must survive exactly.
begin;
set local lock_timeout='5s';
set local statement_timeout='180s';
select pg_advisory_xact_lock(hashtextextended('legendstudy-release57-learning-upgrade',71657));
create temporary table release57_original_functions on commit drop as
select p.oid,n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,
 pg_get_functiondef(p.oid) definition,pg_get_userbyid(p.proowner) owner,p.proacl::text acl,p.proconfig config,p.prosecdef secdef
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where false;
do $guard$ declare expected jsonb; actual record; begin
 if current_user<>'postgres' then raise exception 'RELEASE57_REQUIRES_POSTGRES_ROLE';end if;
 for expected in select value from jsonb_array_elements($snapshot$[{"schema": "essay_beta_private", "proname": "is_beta", "args": "p_grant uuid", "owner": "postgres", "acl": "{postgres=X/postgres,essay_executor=X/postgres}", "config": ["search_path=\"\""], "hash": "846c12982684247d8ce489aabfa9521f", "source_hash": "814673e7125943bdeac2fce020f58f99"}, {"schema": "math_private", "proname": "authorize_billing", "args": "uuid", "owner": "essay_executor", "acl": "{essay_executor=X/essay_executor,math_executor=X/essay_executor}", "config": ["search_path=\"\""], "hash": "3026c4744a65f23403c63c12581877d4", "source_hash": "22bb375d9bf10af5990214652975a3aa"}, {"schema": "math_private", "proname": "evaluation_admission", "args": "", "owner": "postgres", "acl": "{postgres=X/postgres}", "config": ["search_path=\"\""], "hash": "99e6437c3e6cca4c08f0d06f78896b80", "source_hash": "536b6d7e9f74f2a2cf8df21347ef71e6"}, {"schema": "math_private", "proname": "learning_eligibility", "args": "p_evaluation_id uuid, p_at timestamp with time zone", "owner": "postgres", "acl": "{postgres=X/postgres}", "config": ["search_path=\"\""], "hash": "67e094441b482057beb6ab88c475a732", "source_hash": "2c66fcb0db49fb662d09106691656273"}, {"schema": "math_private", "proname": "session_eligibility", "args": "p_eval uuid, p_at timestamp with time zone", "owner": "postgres", "acl": "{postgres=X/postgres}", "config": ["search_path=\"\""], "hash": "dc245a94b299166386cc0ed91ad4ecbc", "source_hash": "537102acb06cbdd44cb91bf549639456"}, {"schema": "public", "proname": "essay_exam_history", "args": "p_run uuid", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres}", "config": ["search_path=\"\""], "hash": "1f7646fc89f40d667768176fbcb4551d", "source_hash": "4f5cf84a94be35cdff4e27be20f7dcaf"}, {"schema": "public", "proname": "math_evaluation_detail", "args": "uuid", "owner": "math_executor", "acl": "{math_executor=X/math_executor,authenticated=X/math_executor,postgres=X/math_executor}", "config": ["search_path=\"\""], "hash": "84ada0ea1872d764ebbb40f57526b3f4", "source_hash": "4a11e8f30cbc227a55df4b621b777120"}, {"schema": "public", "proname": "math_learning", "args": "p_request jsonb", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres}", "config": ["search_path=\"\""], "hash": "09c463d28cd9645a7918fc6b11e48cea", "source_hash": "55e47f50d47f26e6516ccefc0d37d43b"}, {"schema": "public", "proname": "math_reveal_hint", "args": "uuid, uuid", "owner": "math_executor", "acl": "{math_executor=X/math_executor,authenticated=X/math_executor,postgres=X/math_executor}", "config": ["search_path=\"\""], "hash": "b03a65f6f8f9ca6fb590ecc119e4e109", "source_hash": "686442c943ae1b7f7730ec0958215abd"}, {"schema": "public", "proname": "math_session_read", "args": "p_run uuid", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres}", "config": ["search_path=\"\""], "hash": "6a12564da469a5e6c6d1a8dea2ca487a", "source_hash": "259c23f3ea6b195cb8507abdedfba482"}, {"schema": "public", "proname": "math_session_submit", "args": "p_exam uuid, p_key uuid, p_attempts uuid[], p_parent uuid", "owner": "postgres", "acl": "{postgres=X/postgres,authenticated=X/postgres}", "config": ["search_path=\"\""], "hash": "b4b592e12240af3d87efda7b8e03aa71", "source_hash": "d2863f2d70053b939132f6dad087c638"}]$snapshot$::jsonb) loop
  select p.oid,md5(pg_get_functiondef(p.oid)) hash,md5(p.prosrc) source_hash,
   pg_get_userbyid(p.proowner) owner,p.proacl::text acl,to_jsonb(p.proconfig) config into actual
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname=expected->>'schema' and p.proname=expected->>'proname' and pg_get_function_identity_arguments(p.oid)=expected->>'args';
  if not found or actual.hash is distinct from expected->>'hash'
   or actual.owner is distinct from expected->>'owner' or actual.acl is distinct from expected->>'acl'
   or actual.config is distinct from expected->'config' then
   raise exception 'RELEASE57_SOURCE_DRIFT: %.%',expected->>'schema',expected->>'proname';end if;
  insert into release57_original_functions select p.oid,n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid),pg_get_userbyid(p.proowner),p.proacl::text,p.proconfig,p.prosecdef
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.oid=actual.oid;
 end loop;
 if exists(select 1 from pg_auth_members where member='postgres'::regrole and roleid in('math_executor'::regrole,'essay_executor'::regrole)
  and (grantor<>'supabase_admin'::regrole or not admin_option or inherit_option or set_option))
  or (select count(*) from pg_auth_members where member='postgres'::regrole and roleid in('math_executor'::regrole,'essay_executor'::regrole))<>2 then
  raise exception 'RELEASE57_MEMBERSHIP_DRIFT';end if;
 if has_schema_privilege('math_executor','public','CREATE') or has_schema_privilege('math_executor','math_private','CREATE')
  or has_schema_privilege('essay_executor','math_private','CREATE') or has_table_privilege('math_executor','public.math_evaluations','REFERENCES') then
  raise exception 'RELEASE57_TEMPORARY_PRIVILEGE_BASELINE_DRIFT';end if;
 if to_regclass('math_private.coaching_disclosures') is not null or to_regclass('math_private.mixed_coaching_disclosures') is not null or to_regclass('math_private.mixed_coaching_hints') is not null
  or exists(select 1 from pg_attribute where attrelid='math_private.session_runs'::regclass and attname in('previous_run_id','submission_index') and not attisdropped)
  or exists(select 1 from pg_proc where pronamespace in('public'::regnamespace,'math_private'::regnamespace) and proname in
   ('math_coaching','essay_math_coaching','math_session_quote','math_session_continue','cycle_deadline','coaching_projection','mixed_coaching_projection','math_coaching_before_task16g','math_evaluation_detail_task16f_legacy','math_reveal_hint_task16f_legacy','math_learning_task16f_legacy','math_session_read_before_task16g','essay_exam_history_before_task16g')) then
  raise exception 'RELEASE57_ALREADY_INSTALLED_OR_NAMESPACE_COLLISION';end if;
end $guard$;
create temporary table release57_original_memberships on commit drop as select * from pg_auth_members;
create temporary table release57_original_schema_acl on commit drop as select oid,nspowner,nspacl from pg_namespace where nspname in('public','math_private','essay_private');
create temporary table release57_original_table_acl on commit drop as select oid,relowner,relacl,relrowsecurity from pg_class where oid in('public.math_evaluations'::regclass,'public.math_attempts'::regclass,'math_private.session_runs'::regclass,'essay_exam_private.runs'::regclass);
do $tables$ declare e jsonb; a record; obj oid; begin
 for e in select value from jsonb_array_elements($tablesnapshot$[{"kind": "column", "item": {"name": "id", "type": "uuid", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 1, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "account_id", "type": "uuid", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 2, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "exam_id", "type": "uuid", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 3, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "parent_id", "type": "uuid", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 4, "nullable": "YES", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "decision_id", "type": "uuid", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 5, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "request_key", "type": "uuid", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 6, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "snapshot", "type": "jsonb", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 7, "nullable": "NO", "data_type": "jsonb"}}, {"kind": "column", "item": {"name": "state", "type": "text", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 8, "nullable": "NO", "data_type": "text"}}, {"kind": "column", "item": {"name": "result", "type": "jsonb", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 9, "nullable": "YES", "data_type": "jsonb"}}, {"kind": "column", "item": {"name": "created_at", "type": "timestamptz", "table": "runs", "schema": "essay_exam_private", "default": "clock_timestamp()", "ordinal": 10, "nullable": "NO", "data_type": "timestamp with time zone"}}, {"kind": "column", "item": {"name": "completed_at", "type": "timestamptz", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 11, "nullable": "YES", "data_type": "timestamp with time zone"}}, {"kind": "column", "item": {"name": "dispatch_key", "type": "uuid", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 12, "nullable": "YES", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "lease_token", "type": "uuid", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 13, "nullable": "YES", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "lease_until", "type": "timestamptz", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 14, "nullable": "YES", "data_type": "timestamp with time zone"}}, {"kind": "column", "item": {"name": "previous_paid_run_id", "type": "uuid", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 15, "nullable": "YES", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "submission_index", "type": "int4", "table": "runs", "schema": "essay_exam_private", "default": null, "ordinal": 16, "nullable": "YES", "data_type": "integer"}}, {"kind": "column", "item": {"name": "id", "type": "uuid", "table": "session_runs", "schema": "math_private", "default": "gen_random_uuid()", "ordinal": 1, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "student_id", "type": "uuid", "table": "session_runs", "schema": "math_private", "default": null, "ordinal": 2, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "account_id", "type": "uuid", "table": "session_runs", "schema": "math_private", "default": null, "ordinal": 3, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "exam_id", "type": "uuid", "table": "session_runs", "schema": "math_private", "default": null, "ordinal": 4, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "request_key", "type": "uuid", "table": "session_runs", "schema": "math_private", "default": null, "ordinal": 5, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "parent_id", "type": "uuid", "table": "session_runs", "schema": "math_private", "default": null, "ordinal": 6, "nullable": "YES", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "decision_id", "type": "uuid", "table": "session_runs", "schema": "math_private", "default": null, "ordinal": 7, "nullable": "NO", "data_type": "uuid"}}, {"kind": "column", "item": {"name": "attempt_ids", "type": "_uuid", "table": "session_runs", "schema": "math_private", "default": null, "ordinal": 8, "nullable": "NO", "data_type": "ARRAY"}}, {"kind": "column", "item": {"name": "state", "type": "text", "table": "session_runs", "schema": "math_private", "default": "'reserved'::text", "ordinal": 9, "nullable": "NO", "data_type": "text"}}, {"kind": "column", "item": {"name": "created_at", "type": "timestamptz", "table": "session_runs", "schema": "math_private", "default": "clock_timestamp()", "ordinal": 10, "nullable": "NO", "data_type": "timestamp with time zone"}}, {"kind": "column", "item": {"name": "completed_at", "type": "timestamptz", "table": "session_runs", "schema": "math_private", "default": null, "ordinal": 11, "nullable": "YES", "data_type": "timestamp with time zone"}}, {"kind": "constraint", "item": {"name": "runs_account_id_fkey", "table": "runs", "schema": "essay_exam_private", "definition": "FOREIGN KEY (account_id) REFERENCES credit_accounts(id)"}}, {"kind": "constraint", "item": {"name": "runs_account_id_request_key_key", "table": "runs", "schema": "essay_exam_private", "definition": "UNIQUE (account_id, request_key)"}}, {"kind": "constraint", "item": {"name": "runs_check", "table": "runs", "schema": "essay_exam_private", "definition": "CHECK (((state = 'completed'::text) = ((result IS NOT NULL) AND (completed_at IS NOT NULL))))"}}, {"kind": "constraint", "item": {"name": "runs_decision_id_fkey", "table": "runs", "schema": "essay_exam_private", "definition": "FOREIGN KEY (decision_id) REFERENCES essay_billing_decisions(id)"}}, {"kind": "constraint", "item": {"name": "runs_decision_id_key", "table": "runs", "schema": "essay_exam_private", "definition": "UNIQUE (decision_id)"}}, {"kind": "constraint", "item": {"name": "runs_exam_id_fkey", "table": "runs", "schema": "essay_exam_private", "definition": "FOREIGN KEY (exam_id) REFERENCES essay_exams(id)"}}, {"kind": "constraint", "item": {"name": "runs_parent_id_fkey", "table": "runs", "schema": "essay_exam_private", "definition": "FOREIGN KEY (parent_id) REFERENCES essay_exam_private.runs(id)"}}, {"kind": "constraint", "item": {"name": "runs_pkey", "table": "runs", "schema": "essay_exam_private", "definition": "PRIMARY KEY (id)"}}, {"kind": "constraint", "item": {"name": "runs_previous_paid_run_id_fkey", "table": "runs", "schema": "essay_exam_private", "definition": "FOREIGN KEY (previous_paid_run_id) REFERENCES essay_exam_private.runs(id)"}}, {"kind": "constraint", "item": {"name": "runs_state_check", "table": "runs", "schema": "essay_exam_private", "definition": "CHECK ((state = ANY (ARRAY['reserved'::text, 'completed'::text, 'failed'::text])))"}}, {"kind": "constraint", "item": {"name": "runs_submission_index_check", "table": "runs", "schema": "essay_exam_private", "definition": "CHECK ((submission_index > 0))"}}, {"kind": "constraint", "item": {"name": "session_runs_account_id_fkey", "table": "session_runs", "schema": "math_private", "definition": "FOREIGN KEY (account_id) REFERENCES credit_accounts(id)"}}, {"kind": "constraint", "item": {"name": "session_runs_decision_id_fkey", "table": "session_runs", "schema": "math_private", "definition": "FOREIGN KEY (decision_id) REFERENCES essay_billing_decisions(id)"}}, {"kind": "constraint", "item": {"name": "session_runs_decision_id_key", "table": "session_runs", "schema": "math_private", "definition": "UNIQUE (decision_id)"}}, {"kind": "constraint", "item": {"name": "session_runs_exam_id_fkey", "table": "session_runs", "schema": "math_private", "definition": "FOREIGN KEY (exam_id) REFERENCES essay_exams(id)"}}, {"kind": "constraint", "item": {"name": "session_runs_parent_id_fkey", "table": "session_runs", "schema": "math_private", "definition": "FOREIGN KEY (parent_id) REFERENCES math_private.session_runs(id) ON DELETE CASCADE"}}, {"kind": "constraint", "item": {"name": "session_runs_pkey", "table": "session_runs", "schema": "math_private", "definition": "PRIMARY KEY (id)"}}, {"kind": "constraint", "item": {"name": "session_runs_state_check", "table": "session_runs", "schema": "math_private", "definition": "CHECK ((state = ANY (ARRAY['reserved'::text, 'completed'::text, 'cancelled'::text])))"}}, {"kind": "constraint", "item": {"name": "session_runs_student_id_fkey", "table": "session_runs", "schema": "math_private", "definition": "FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE"}}, {"kind": "constraint", "item": {"name": "session_runs_student_id_request_key_key", "table": "session_runs", "schema": "math_private", "definition": "UNIQUE (student_id, request_key)"}}, {"kind": "index", "item": {"indexdef": "CREATE UNIQUE INDEX runs_pkey ON essay_exam_private.runs USING btree (id)", "indexname": "runs_pkey", "tablename": "runs", "schemaname": "essay_exam_private", "tablespace": null}}, {"kind": "index", "item": {"indexdef": "CREATE UNIQUE INDEX runs_decision_id_key ON essay_exam_private.runs USING btree (decision_id)", "indexname": "runs_decision_id_key", "tablename": "runs", "schemaname": "essay_exam_private", "tablespace": null}}, {"kind": "index", "item": {"indexdef": "CREATE UNIQUE INDEX runs_account_id_request_key_key ON essay_exam_private.runs USING btree (account_id, request_key)", "indexname": "runs_account_id_request_key_key", "tablename": "runs", "schemaname": "essay_exam_private", "tablespace": null}}, {"kind": "index", "item": {"indexdef": "CREATE INDEX exam_runs_account_time ON essay_exam_private.runs USING btree (account_id, created_at DESC, id DESC)", "indexname": "exam_runs_account_time", "tablename": "runs", "schemaname": "essay_exam_private", "tablespace": null}}, {"kind": "index", "item": {"indexdef": "CREATE UNIQUE INDEX exam_included_once ON essay_exam_private.runs USING btree (parent_id) WHERE ((parent_id IS NOT NULL) AND (state <> 'failed'::text))", "indexname": "exam_included_once", "tablename": "runs", "schemaname": "essay_exam_private", "tablespace": null}}, {"kind": "index", "item": {"indexdef": "CREATE UNIQUE INDEX exam_paid_successor_once ON essay_exam_private.runs USING btree (previous_paid_run_id) WHERE ((previous_paid_run_id IS NOT NULL) AND (parent_id IS NULL) AND (state <> 'failed'::text))", "indexname": "exam_paid_successor_once", "tablename": "runs", "schemaname": "essay_exam_private", "tablespace": null}}, {"kind": "index", "item": {"indexdef": "CREATE UNIQUE INDEX session_runs_pkey ON math_private.session_runs USING btree (id)", "indexname": "session_runs_pkey", "tablename": "session_runs", "schemaname": "math_private", "tablespace": null}}, {"kind": "index", "item": {"indexdef": "CREATE UNIQUE INDEX session_runs_decision_id_key ON math_private.session_runs USING btree (decision_id)", "indexname": "session_runs_decision_id_key", "tablename": "session_runs", "schemaname": "math_private", "tablespace": null}}, {"kind": "index", "item": {"indexdef": "CREATE UNIQUE INDEX session_runs_student_id_request_key_key ON math_private.session_runs USING btree (student_id, request_key)", "indexname": "session_runs_student_id_request_key_key", "tablename": "session_runs", "schemaname": "math_private", "tablespace": null}}, {"kind": "table", "item": {"acl": "{postgres=arwdDxtm/postgres}", "rls": true, "owner": "postgres", "table": "runs", "schema": "essay_exam_private", "force_rls": true}}, {"kind": "table", "item": {"acl": "{postgres=arwdDxtm/postgres}", "rls": true, "owner": "postgres", "table": "session_runs", "schema": "math_private", "force_rls": false}}]$tablesnapshot$::jsonb) loop

  if e->>'kind'='column' then
   obj=to_regclass((e->'item'->>'schema')||'.'||(e->'item'->>'table'));
   select t.typname type,att.attnotnull,pg_get_expr(d.adbin,d.adrelid) def,att.attnum into a
    from pg_attribute att join pg_type t on t.oid=att.atttypid left join pg_attrdef d on d.adrelid=att.attrelid and d.adnum=att.attnum
    where att.attrelid=obj and att.attname=e->'item'->>'name' and not att.attisdropped;
   if not found or a.type<>e->'item'->>'type' or a.attnotnull<>((e->'item'->>'nullable')='NO') or a.def is distinct from e->'item'->>'default' or a.attnum<>(e->'item'->>'ordinal')::int then raise exception 'RELEASE57_COLUMN_DRIFT: %',e->'item';end if;
  elsif e->>'kind'='constraint' then
   select pg_get_constraintdef(oid) def into a from pg_constraint where conrelid=to_regclass((e->'item'->>'schema')||'.'||(e->'item'->>'table')) and conname=e->'item'->>'name';
   if not found or a.def<>e->'item'->>'definition' then raise exception 'RELEASE57_CONSTRAINT_DRIFT: %',e->'item'->>'name';end if;
  elsif e->>'kind'='table' then
   select pg_get_userbyid(relowner) owner,relacl::text acl,relrowsecurity rls,relforcerowsecurity force into a from pg_class where oid=to_regclass((e->'item'->>'schema')||'.'||(e->'item'->>'table'));
   if not found or a.owner<>e->'item'->>'owner' or a.acl is distinct from e->'item'->>'acl' or a.rls<>(e->'item'->>'rls')::boolean or a.force<>(e->'item'->>'force_rls')::boolean then raise exception 'RELEASE57_TABLE_DRIFT: %',e->'item'->>'table';end if;
  end if;
 end loop;
 if not exists(select 1 from pg_attribute where attrelid='public.math_subproblems'::regclass and attname='essay_question_id' and atttypid='uuid'::regtype and not attisdropped) then raise exception 'RELEASE57_CANONICAL_QUESTION_LINK_MISSING';end if;
end $tables$;

-- Explicit temporary SET bridge. The original supabase_admin grant is never revoked.
grant math_executor to postgres with admin false,inherit false,set true granted by postgres;
grant essay_executor to postgres with admin false,inherit false,set true granted by postgres;
grant create on schema public,math_private to math_executor;
grant create on schema math_private to essay_executor;
grant references on public.math_evaluations to math_executor;
-- RELEASE57_AFTER_TEMPORARY_PRIVILEGES

-- BEGIN REUSED supabase/candidates/task16g_learning_loop/coaching.test.sql SHA256 ef88e02ad990986e2b58678a9bcfd5b570033da6acd286915c6b67f5279f2a59
-- TASK16-F candidate only. NOT APPLIED to Production. Existing evaluator/billing unchanged.
set role math_executor;
create table math_private.coaching_disclosures(
 evaluation_id uuid primary key references public.math_evaluations(id) on delete cascade,
 student_id uuid not null, -- owning evaluation cascades through existing deletion lifecycle
 client_key uuid not null unique, delivered_at timestamptz not null default clock_timestamp()
);
alter table math_private.coaching_disclosures enable row level security;
grant select on math_private.coaching_disclosures to postgres; -- Read-only common History projection; no client table access.
revoke all on math_private.coaching_disclosures from public,anon,authenticated,service_role;

-- Only deterministic, reviewed labels are public before disclosure. Student work is not an answer secret.
create function math_private.coaching_projection(p_id uuid,p_result jsonb,p_student text,p_policy jsonb,p_disclosed boolean)
returns jsonb language plpgsql immutable set search_path='' as $$
declare tasks jsonb='[]'; strengths jsonb='[]'; concepts jsonb='[]'; item jsonb; step jsonb; title text; direction text; total integer=0;
begin
 for item in select value from jsonb_array_elements(coalesce(p_result->'errors','[]'))
  where value->>'classification'='ROOT' and coalesce(value->>'materiality','MATERIAL_ERROR') not in ('NON_ERROR_VARIATION','PRESENTATION_ISSUE')
  order by case value->>'materiality' when 'MATERIAL_ERROR' then 0 else 1 end,value->>'id' loop
  total=total+1;if total>5 then continue;end if;
  select value into step from jsonb_array_elements(coalesce(p_result->'steps','[]')) where value->>'id'=item->>'step_id';
  title=case item->>'category' when 'CALCULATION' then '계산 과정과 검산' when 'SIGN' then '부호와 식의 변형' when 'THEOREM_MISUSE' then '공식의 적용 조건' when 'CONCLUSION' then '결론과 경계 조건' else '풀이의 조건과 논리 연결' end;
  direction=case item->>'category' when 'CALCULATION' then '한 번에 계산한 부분을 나누어 다시 검산해 보세요.' when 'SIGN' then '식을 옮기거나 나누는 과정의 부호를 확인해 보세요.' when 'CONCLUSION' then '경계값이 원래 조건을 만족하는지 대입해 보세요.' else '사용한 정의와 정리의 조건이 모두 성립하는지 확인해 보세요.' end;
  tasks=tasks||jsonb_build_array(jsonb_build_object('id',item->>'id','step_id',item->>'step_id','position',step->'position','title',title,'importance',case item->>'materiality' when 'MATERIAL_ERROR' then '중요도 높음' else '중요도 보통' end,'student_formula',p_student,'description','원본에서 확인한 학생 풀이와 문제의 조건을 대조하세요.','direction',direction,'source_note','학생 확인 전사본 · AI가 다시 작성한 수식이 아닙니다.'));
 end loop;
 if exists(select 1 from jsonb_array_elements(coalesce(p_result->'steps','[]')) where value->>'status'='VALID') then
 strengths=jsonb_build_array(jsonb_build_object('title','타당한 풀이 단계의 유지','description','저장된 평가에서 타당하다고 인정된 단계가 있습니다. 학생 답안과 공식 평가 근거를 함께 확인하세요.','student_formula',p_student));end if;
 if total>0 then concepts=jsonb_build_array(jsonb_build_object('id','equivalence','name','동치 변형과 적용 조건','formula','a=b \Rightarrow a+c=b+c','description','식을 변형할 때 앞뒤 조건이 같은 해를 표현하는지 확인합니다.','condition','양변에 같은 연산을 적용하고 정의역을 유지합니다.','caution','나누는 식이 영인지, 부등식에서 부호가 바뀌는지 확인합니다.','relation','오류로 연결된 식의 변형과 조건 누락을 점검합니다.'));end if;
 return jsonb_build_object('version','math-coaching-v1','evaluation_id',p_id,'disclosed',p_disclosed,'diagnosis',case when p_result->'overall'->>'status'='NOT_DETERMINABLE' or p_result->'overall'->>'review_status'='HUMAN_REVIEW_REQUIRED' then '현재 답안은 확정 판정할 수 없습니다. 인식 결과와 평가 근거를 다시 확인해야 합니다.' when total=0 then '저장된 평가에서 우선 수정할 오류가 확인되지 않았습니다.' else '풀이에서 우선 점검할 부분이 있습니다. 조건과 계산을 확인한 뒤 직접 수정해 보세요.' end,'tasks',tasks,'remaining_task_count',greatest(0,total-5),'strengths',strengths,'concepts',concepts,'rewrite_policy',p_policy);
end$$;
revoke all on function math_private.coaching_projection(uuid,jsonb,text,jsonb,boolean) from public,anon,authenticated,service_role;

create function public.math_coaching(p_request jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare u uuid; e public.math_evaluations; a public.math_attempts; v jsonb=p_request->'payload'; action text=p_request->>'action'; answer jsonb; policy jsonb; disclosed boolean; student text; item jsonb; refs jsonb; h public.math_hints; key uuid; old math_private.coaching_disclosures; history jsonb; task jsonb; projected_tasks jsonb; source_regions jsonb; matched_text text; step_regions jsonb;
begin
 u=math_private.current_subject();perform math_private.require_active(array[u]);
 if p_request->>'dto_version' is distinct from 'math-coaching-v1' or p_request-array['dto_version','action','payload']<>'{}' or jsonb_typeof(v) is distinct from 'object' or action not in ('read','reveal','hint','history') or action is null then raise invalid_parameter_value;end if;
 if v-(case when action='hint' then array['evaluation_id','client_submission_id','task_id','level'] when action='reveal' then array['evaluation_id','client_submission_id'] else array['evaluation_id'] end)<>'{}' then raise invalid_parameter_value;end if;
 select er.* into e from public.math_evaluations er join public.math_attempts ar on ar.id=er.attempt_id where er.id=(v->>'evaluation_id')::uuid and ar.student_id=u;
 if not found then raise no_data_found;end if;
 if e.state<>'COMPLETED' then raise invalid_parameter_value using message='EVALUATION_NOT_COMPLETE';end if;
 select * into a from public.math_attempts where id=e.attempt_id;
 if action='reveal' then
  key=(v->>'client_submission_id')::uuid;if key is null then raise invalid_parameter_value;end if;
  perform pg_advisory_xact_lock(hashtextextended(e.id::text,716));
  select * into old from math_private.coaching_disclosures where client_key=key;
  if found and old.evaluation_id<>e.id then raise unique_violation using message='DISCLOSURE_RETRY_CONFLICT';end if;
  insert into math_private.coaching_disclosures(evaluation_id,student_id,client_key) values(e.id,u,key) on conflict(evaluation_id) do nothing;
 end if;
 disclosed=exists(select 1 from math_private.coaching_disclosures where evaluation_id=e.id and student_id=u);
 if action='history' then
  history=public.math_learning(jsonb_build_object('dto_version','math-learning-v1','action','read_learning_history','payload',jsonb_build_object('evaluation_id',e.id)))->'result';
  answer=jsonb_build_object('lineage_id',history->'lineage_id','attempts','[]'::jsonb);
  for item in select value from jsonb_array_elements(history->'attempts') loop
   answer=jsonb_set(answer,'{attempts}',answer->'attempts'||jsonb_build_array((item-'reevaluation_delta')||jsonb_build_object('solution_revealed',coalesce((item->>'solution_revealed')::boolean,false) or exists(select 1 from math_private.coaching_disclosures where evaluation_id=(item->>'evaluation_id')::uuid))));
  end loop;
 elsif action='hint' then
  if v->>'level' is null or (v->>'level')::integer not in (1,2) or v->>'client_submission_id' is null then raise invalid_parameter_value;end if;
  select hints.* into h from public.math_hints hints join public.math_core core on core.id=hints.core_id where core.evaluation_id=e.id and core.error_id=(v->>'task_id')::uuid and hints.level=(v->>'level')::integer and hints.validated;
  if not found then raise invalid_parameter_value using message='HINT_UNAVAILABLE';end if;
  perform public.math_reveal_hint(h.id,(v->>'client_submission_id')::uuid);
  answer=jsonb_build_object('level',h.level,'body',case when h.level=1 then '사용한 정의·정리의 적용 조건을 확인하고 원래 문제의 조건과 대조하세요.' else '조건을 적용한 각 계산을 검산하고 수정한 풀이를 원래 풀이와 비교하세요.' end);
 else
  policy=(public.math_learning(jsonb_build_object('dto_version','math-learning-v1','action','read_learning_state','payload',jsonb_build_object('evaluation_id',e.id)))->'result'->'included_reevaluation')||jsonb_build_object('paid_available',false);
  select string_agg(coalesce(nullif(normalized_math,''),raw_text),E'\n' order by reading_order) into student from public.math_extraction_regions where run_id=e.selected_extraction_id;
  student=coalesce(student,a.typed_answer,'');
  answer=math_private.coaching_projection(e.id,e.result,student,policy,disclosed)||jsonb_build_object('attempt_id',a.id,'lineage_id',a.lineage_id,'completed_at',e.completed_at);
  -- Original confirmed region text is authoritative; never copy AI step.representation.
  projected_tasks='[]';
  for task in select value from jsonb_array_elements(answer->'tasks') loop
   select value->'regions' into step_regions from jsonb_array_elements(e.result->'steps') where value->>'id'=task->>'step_id';
   select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'artifact_id',r.artifact_id,'page',r.page,'reading_order',r.reading_order,'x',r.x,'y',r.y,'width',r.width,'height',r.height) order by r.reading_order),'[]'),
    string_agg(coalesce(nullif(r.normalized_math,''),r.raw_text),E'\n' order by r.reading_order)
    into source_regions,matched_text from public.math_extraction_regions r
    where r.run_id=e.selected_extraction_id and exists(select 1 from jsonb_array_elements(coalesce(step_regions,'[]')) z where z#>>'{}'=r.id::text or z->>'region_id'=r.id::text);
   projected_tasks=projected_tasks||jsonb_build_array(task||jsonb_build_object('source_regions',source_regions,'student_formula',coalesce(matched_text,student),'source_note',case when matched_text is null then '단계별 원본 영역 연결 미확정 · 전체 학생 확인 전사본' else '해당 단계에 연결된 학생 확인 전사본' end));
  end loop;
  answer=jsonb_set(answer,'{tasks}',projected_tasks);
  answer=answer||(select jsonb_build_object('exam_label',ps.label||' · '||s.leaf_key) from public.math_subproblems s join public.math_problems p on p.id=s.problem_id join public.math_problem_sets ps on ps.id=p.problem_set_id where s.id=e.leaf_id);
  if disclosed then
   select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'origin',s.origin,'body',s.body)),'[]') into refs from public.math_considered_references cr join public.math_canonical_solutions s on s.id=cr.solution_id where cr.evaluation_id=e.id;
   answer=answer||jsonb_build_object('full_solution',jsonb_build_object('steps',e.result->'steps','paths',e.result->'paths','references',refs,'generated_solution',e.result->'generated_solution'));
  end if;
 end if;
 return jsonb_build_object('dto_version','math-coaching-v1','action',action,'result',answer);
end$$;
revoke all on function public.math_coaching(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.math_coaching(jsonb) to authenticated;
reset role;

-- END REUSED coaching.test.sql

-- BEGIN REUSED supabase/candidates/task16f_math_coaching/002_disclosure_boundary.sql SHA256 544c28d8c2b5a6b3e482028663a928220614719e215e3b74998f747660c9377d
-- Candidate: close legacy standalone Math result/hint/state bypasses too.
-- Mixed essay_exam_history is a separate rollout blocker: do not enable globally until audited.
set role math_executor;
alter function public.math_evaluation_detail(uuid) rename to math_evaluation_detail_task16f_legacy;
revoke all on function public.math_evaluation_detail_task16f_legacy(uuid) from public,anon,authenticated,service_role;
create function public.math_evaluation_detail(p_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare u uuid; answer jsonb;
begin
 u=math_private.current_subject();perform math_private.require_active(array[u]);
 answer=public.math_evaluation_detail_task16f_legacy(p_id);
 if not exists(select 1 from math_private.coaching_disclosures where evaluation_id=p_id and student_id=u) then
  answer=jsonb_build_object('evaluation_id',p_id,'disclosed',false,'coaching_required',true);
 end if;return answer;
end$$;
revoke all on function public.math_evaluation_detail(uuid) from public,anon,authenticated,service_role;
grant execute on function public.math_evaluation_detail(uuid) to authenticated,postgres;
alter function public.math_reveal_hint(uuid,uuid) rename to math_reveal_hint_task16f_legacy;
revoke all on function public.math_reveal_hint_task16f_legacy(uuid,uuid) from public,anon,authenticated,service_role;
create function public.math_reveal_hint(p_hint uuid,p_key uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare answer jsonb;
begin
 answer=public.math_reveal_hint_task16f_legacy(p_hint,p_key);
 return (answer-'body')||jsonb_build_object('body',case when answer->>'level'='0' then '문제의 조건과 학생 풀이의 해당 단계를 대조하세요.' when answer->>'level'='1' then '사용한 정의와 정리의 적용 조건을 확인하세요.' else '각 계산을 검산하고 수정한 풀이를 원래 풀이와 비교하세요.' end);
end$$;
revoke all on function public.math_reveal_hint(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.math_reveal_hint(uuid,uuid) to authenticated,postgres;
reset role;
-- Existing math_learning is owned by postgres, unlike the two Math-owned helpers.
alter function public.math_learning(jsonb) rename to math_learning_task16f_legacy;
revoke all on function public.math_learning_task16f_legacy(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.math_learning_task16f_legacy(jsonb) to math_executor;
create function public.math_learning(p_request jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare answer jsonb; data jsonb; rows jsonb; item jsonb;
begin
 answer=public.math_learning_task16f_legacy(p_request);data=answer->'result';
 if p_request->>'action'='read_learning_state' then
  rows='[]';for item in select value from jsonb_array_elements(data->'core') loop
   rows=rows||jsonb_build_array(jsonb_build_object('core_id',item->'core_id','position',item->'position','error_id',item->'error_id','step_id',item->'step_id','title','풀이 단계 확인','diagnosis','조건과 계산을 대조하세요.','why','사용한 개념의 조건을 확인하세요.','next_action','직접 풀이를 수정하세요.'));
  end loop;data=(data-'reevaluation_delta')||jsonb_build_object('core',rows,'reevaluation_delta',null);
 elsif p_request->>'action'='read_learning_history' then
  rows='[]';for item in select value from jsonb_array_elements(data->'attempts') loop rows=rows||jsonb_build_array((item-'reevaluation_delta')||jsonb_build_object('solution_revealed',coalesce((item->>'solution_revealed')::boolean,false) or exists(select 1 from math_private.coaching_disclosures where evaluation_id=(item->>'evaluation_id')::uuid and student_id=auth.uid()),'reference_solution_revealed_before_resolve',coalesce((item->>'reference_solution_revealed_before_resolve')::boolean,false) or exists(select 1 from math_private.coaching_disclosures where evaluation_id=(item->>'prior_evaluation_id')::uuid and student_id=auth.uid() and delivered_at<=(item->>'created_at')::timestamptz)));end loop;
  data=jsonb_set(data,'{attempts}',rows);
 end if;
 return jsonb_set(answer,'{result}',data);
end$$;
revoke all on function public.math_learning(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.math_learning(jsonb) to authenticated,math_executor;

-- END REUSED 002_disclosure_boundary.sql

-- BEGIN REUSED supabase/candidates/task16g_learning_loop/loop.sql SHA256 46a7ad3ab75258e4e549782c0bc8bc9052c8d4e3aa4d5df1254e11cf6f5f5e73
-- Additive continuation contract. Existing immutable attempts and ledger are reused.
alter table math_private.session_runs add column previous_run_id uuid references math_private.session_runs(id), add column submission_index integer;
create unique index math_session_one_live_successor on math_private.session_runs(student_id,previous_run_id) where previous_run_id is not null and state<>'cancelled';

create function math_private.cycle_deadline(p_decision uuid,p_completed timestamptz) returns timestamptz
language plpgsql stable security definer set search_path='' as $$
declare expiry timestamptz;
begin
 -- Beta revision cutoff, not its daily spending expiry, limits the 14-day revision window.
 select min(bg.revision_cutoff) into expiry from public.credit_transactions t join public.credit_grants g on g.id=t.grant_id join essay_beta_private.daily_grants bg on bg.grant_id=g.id
 where t.decision_id=p_decision and t.transaction_type='consume' and essay_beta_private.is_beta(g.id);
 return least(p_completed+interval '336 hours',expiry);
end$$;
revoke all on function math_private.cycle_deadline(uuid,timestamptz) from public,anon,authenticated,service_role;
grant execute on function math_private.cycle_deadline(uuid,timestamptz) to essay_executor;

create function public.math_session_quote(p_previous uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare r math_private.session_runs; root math_private.session_runs; free boolean;
begin
 perform math_private.require_active(array[auth.uid()]);
 select * into r from math_private.session_runs where id=p_previous and student_id=auth.uid();
 if not found then raise insufficient_privilege;end if;
 select * into root from math_private.session_runs where id=coalesce(r.parent_id,r.id);
 if r.state<>'completed' then raise invalid_parameter_value using message='PREVIOUS_ROUND_INCOMPLETE';end if;
 free=r.parent_id is null and clock_timestamp()<math_private.cycle_deadline(root.decision_id,root.completed_at)
 and not exists(select 1 from math_private.session_runs where parent_id=root.id and state<>'cancelled')
 and not exists(select 1 from public.credit_transactions where decision_id=root.decision_id and transaction_type='refund');
 return jsonb_build_object('version','math-session-quote-v1','previous_run_id',r.id,'exam_id',r.exam_id,'credits_required',case when free then 0 else 1 end,
 'included_parent_id',case when free then root.id else null end,'free_expires_at',math_private.cycle_deadline(root.decision_id,root.completed_at),'submission_index',coalesce(r.submission_index,case when r.parent_id is null then 1 else 2 end)+1);
end$$;
revoke all on function public.math_session_quote(uuid) from public,anon,authenticated,service_role;
grant execute on function public.math_session_quote(uuid) to authenticated;

create function public.math_session_continue(p_exam uuid,p_key uuid,p_attempts uuid[],p_previous uuid,p_expected_credits integer) returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare u uuid=auth.uid(); account uuid; previous math_private.session_runs; existing math_private.session_runs; ids uuid[]; quote jsonb; result uuid;
begin
 perform math_private.require_active(array[u]);
 select id into account from public.credit_accounts where user_id=u for update;
 if account is null then raise insufficient_privilege;end if;
 if p_expected_credits is null or p_expected_credits not in (0,1) or p_key is null or p_exam is null or coalesce(cardinality(p_attempts),0) not between 1 and 100 then raise invalid_parameter_value;end if;
 select array_agg(x order by x) into ids from unnest(p_attempts) x;
 select * into existing from math_private.session_runs where student_id=u and request_key=p_key;
 if found then
  if existing.exam_id<>p_exam or existing.attempt_ids<>ids or existing.previous_run_id is distinct from p_previous
   or (select credits_required from public.essay_billing_decisions where id=existing.decision_id)<>p_expected_credits then raise unique_violation using message='SESSION_REPLAY_CONFLICT';end if;
  return existing.id;
 end if;
 if p_previous is null then
  if p_expected_credits<>1 then raise invalid_parameter_value using message='CHARGE_CHANGED';end if;
  result=public.math_session_submit(p_exam,p_key,p_attempts,null);
  update math_private.session_runs set submission_index=1 where id=result;
  return result;
 end if;
 select * into previous from math_private.session_runs where id=p_previous and student_id=u for update;
 if not found or previous.exam_id<>p_exam then raise insufficient_privilege;end if;
 if exists(select 1 from math_private.session_runs where previous_run_id=previous.id and state<>'cancelled') then raise unique_violation using message='ROUND_ALREADY_CONTINUED';end if;
 quote=public.math_session_quote(previous.id);
 if (quote->>'credits_required')::integer<>p_expected_credits then raise invalid_parameter_value using message='CHARGE_CHANGED';end if;
 if (select array_agg(leaf_id order by leaf_id) from public.math_attempts where id=any(ids) and student_id=u) is distinct from (select array_agg(leaf_id order by leaf_id) from math_private.session_members where run_id=previous.id) then raise invalid_parameter_value using message='FROZEN_QUESTION_SET';end if;
 if exists(select 1 from public.math_attempts child where child.id=any(ids) and not exists(
  select 1 from math_private.session_members pm join math_private.session_evaluations x on x.attempt_id=pm.attempt_id join public.math_evaluations e on e.id=x.evaluation_id
  where pm.run_id=previous.id and pm.leaf_id=child.leaf_id and child.predecessor_id=pm.attempt_id and child.prior_evaluation_id=e.id and e.state='COMPLETED')) then raise invalid_parameter_value using message='INVALID_REWRITE_SOURCE';end if;
 result=public.math_session_submit(p_exam,p_key,p_attempts,(quote->>'included_parent_id')::uuid);
 update math_private.session_runs set previous_run_id=previous.id,submission_index=(quote->>'submission_index')::integer where id=result;
 return result;
end$$;
revoke all on function public.math_session_continue(uuid,uuid,uuid[],uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.math_session_continue(uuid,uuid,uuid[],uuid,integer) to authenticated;

alter function public.math_session_read(uuid) rename to math_session_read_before_task16g;
revoke all on function public.math_session_read_before_task16g(uuid) from public,anon,authenticated,service_role;
create function public.math_session_read(p_run uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare answer jsonb; r math_private.session_runs; quote jsonb;
begin
 answer=public.math_session_read_before_task16g(p_run);
 select * into r from math_private.session_runs where id=p_run and student_id=auth.uid();
 if not found then raise insufficient_privilege;end if;
 if r.state='completed' then quote=public.math_session_quote(r.id);end if;
 return answer||jsonb_build_object('previous_run_id',r.previous_run_id,'submission_index',coalesce(r.submission_index,case when r.parent_id is null then 1 else 2 end),'continuous_cycles_supported',true,'next_quote',quote,
 'free_rewrite_available',coalesce((quote->>'credits_required')::integer=0,false),'credits_required',(select credits_required from public.essay_billing_decisions where id=r.decision_id));
end$$;
revoke all on function public.math_session_read(uuid) from public,anon,authenticated,service_role;
grant execute on function public.math_session_read(uuid) to authenticated;

-- Update only recognized source clauses; retain beta allocator/lease/owner/idempotency logic.
set role essay_executor;
do $$declare definition text;begin
 definition=pg_get_functiondef('math_private.authorize_billing(uuid)'::regprocedure);
 if position('pe.request_kind=''MATH_INITIAL_EVALUATION''' in definition)=0 then raise exception 'UNEXPECTED_MATH_BILLING_BODY';end if;
 if (length(definition)-length(replace(definition,'pe.request_kind=''MATH_INITIAL_EVALUATION''','')))/length('pe.request_kind=''MATH_INITIAL_EVALUATION''')<>1 then raise exception 'RELEASE57_PATCH_OCCURRENCE_DRIFT';end if;
 definition=replace(definition,'pe.request_kind=''MATH_INITIAL_EVALUATION''','pe.id=(select latest.id from public.math_evaluations latest join public.math_attempts la on la.id=latest.attempt_id join public.math_billing_bindings lb on lb.math_evaluation_id=latest.id join public.essay_billing_decisions ld on ld.id=lb.billing_decision_id where la.lineage_id=a.lineage_id and la.student_id=a.student_id and latest.state=''COMPLETED'' and ld.reason=''paid_cycle'' and ld.status=''settled'' order by latest.completed_at desc,latest.id desc limit 1)');
 if (length(definition)-length(replace(definition,'pe.completed_at+interval ''336 hours''','')))/length('pe.completed_at+interval ''336 hours''')<>1 then raise exception 'RELEASE57_PATCH_OCCURRENCE_DRIFT';end if;
 definition=replace(definition,'pe.completed_at+interval ''336 hours''','math_private.cycle_deadline(d.id,pe.completed_at)');
 execute definition;
end$$;
reset role;
do $$declare definition text;begin
 definition=pg_get_functiondef('math_private.learning_eligibility(uuid,timestamptz)'::regprocedure);
 if position('e.request_kind=''MATH_INITIAL_EVALUATION''' in definition)=0 then raise exception 'UNEXPECTED_MATH_ELIGIBILITY_BODY';end if;
 if (length(definition)-length(replace(definition,'e.request_kind=''MATH_INITIAL_EVALUATION''','')))/length('e.request_kind=''MATH_INITIAL_EVALUATION''')<>1 then raise exception 'RELEASE57_PATCH_OCCURRENCE_DRIFT';end if;
 definition=replace(definition,'e.request_kind=''MATH_INITIAL_EVALUATION''','exists(select 1 from public.math_billing_bindings b join public.essay_billing_decisions d on d.id=b.billing_decision_id where b.math_evaluation_id=e.id and d.reason=''paid_cycle'' and d.status=''settled'')');
 if (length(definition)-length(replace(definition,'initial.completed_at+interval ''336 hours''','')))/length('initial.completed_at+interval ''336 hours''')<>1 then raise exception 'RELEASE57_PATCH_OCCURRENCE_DRIFT';end if;
 definition=replace(definition,'initial.completed_at+interval ''336 hours''','math_private.cycle_deadline(decision.id,initial.completed_at)');
 execute definition;
 -- Existing free submit and eligibility use the same beta/14-day deadline.
 definition=pg_get_functiondef('public.math_session_submit(uuid,uuid,uuid[],uuid)'::regprocedure);
 if (length(definition)-length(replace(definition,'parent.completed_at+interval ''336 hours''','')))/length('parent.completed_at+interval ''336 hours''')<>1 then raise exception 'RELEASE57_PATCH_OCCURRENCE_DRIFT';end if;
 definition=replace(definition,'parent.completed_at+interval ''336 hours''','math_private.cycle_deadline(parent.decision_id,parent.completed_at)');
 execute definition;
 definition=pg_get_functiondef('math_private.session_eligibility(uuid,timestamptz)'::regprocedure);
 if (length(definition)-length(replace(definition,'root.completed_at+interval ''336 hours''','')))/length('root.completed_at+interval ''336 hours''')<>2 then raise exception 'RELEASE57_PATCH_OCCURRENCE_DRIFT';end if;
 definition=replace(definition,'root.completed_at+interval ''336 hours''','math_private.cycle_deadline(root.decision_id,root.completed_at)');
 execute definition;
end$$;

-- END REUSED loop.sql

-- BEGIN REUSED supabase/candidates/task16g_learning_loop/mixed_disclosure.sql SHA256 a947b574c8a2788a21fb6ee74a198fb6a66cc435564ec60625d237a5af9dc1c9
-- Extend the same projection to mixed Math children; humanities remain byte-identical.
create table math_private.mixed_coaching_disclosures (
 run_id uuid not null references essay_exam_private.runs(id) on delete cascade,
 question_id uuid not null, student_id uuid not null, client_key uuid not null unique,
 delivered_at timestamptz not null default clock_timestamp(), primary key(run_id,question_id)
);
alter table math_private.mixed_coaching_disclosures enable row level security;
revoke all on math_private.mixed_coaching_disclosures from public,anon,authenticated,service_role;
set role math_executor;
grant execute on function math_private.coaching_projection(uuid,jsonb,text,jsonb,boolean) to postgres;
reset role;

alter function public.essay_exam_history(uuid) rename to essay_exam_history_before_task16g;
revoke all on function public.essay_exam_history_before_task16g(uuid) from public,anon,authenticated,service_role;
create function math_private.mixed_coaching_projection(p_run jsonb,p_question jsonb,p_disclosed boolean) returns jsonb
language plpgsql immutable set search_path='' as $$
declare answer jsonb; student text;
begin
 select value->>'body' into student from jsonb_array_elements(p_run->'answers') where value->>'questionId'=p_question->>'questionId';
 answer=math_private.coaching_projection((p_question->>'questionId')::uuid,p_question->'evaluation',coalesce(student,''),jsonb_build_object('eligible',coalesce((p_run->>'free_rewrite_available')::boolean,false),'expires_at',p_run->'free_rewrite_expires_at','paid_available',true),p_disclosed);
 answer=answer||jsonb_build_object('run_id',p_run->'id','question_id',p_question->'questionId','exam_label',p_run->'title','completed_at',p_run->'completed_at');
 if p_disclosed then answer=answer||jsonb_build_object('full_solution',jsonb_build_object('steps',p_question->'evaluation'->'steps','paths',p_question->'evaluation'->'paths','generated_solution',p_question->'evaluation'->'generated_solution'));end if;
 return answer;
end$$;
revoke all on function math_private.mixed_coaching_projection(jsonb,jsonb,boolean) from public,anon,authenticated,service_role;

create function public.essay_exam_history(p_run uuid default null) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare answer jsonb; r jsonb; q jsonb; rows jsonb='[]'; questions jsonb; mixed boolean; disclosed boolean;
begin
 answer=public.essay_exam_history_before_task16g(p_run);
 for r in select value from jsonb_array_elements(answer->'runs') loop
  mixed=false;questions='[]';
  for q in select value from jsonb_array_elements(coalesce(r->'result'->'questions','[]')) loop
   if q->'evaluation'->>'contract_version'='math-eval-v1' then
    mixed=true;
    disclosed=exists(select 1 from math_private.mixed_coaching_disclosures where run_id=(r->>'id')::uuid and question_id=(q->>'questionId')::uuid and student_id=auth.uid());
    -- Keep stored raw Math exclusively behind explicit disclosure, including legacy History consumers.
    if not disclosed then
     q=jsonb_build_object('questionId',q->'questionId','rubricVersion',q->'rubricVersion','evidenceVersion',q->'evidenceVersion','evaluation',jsonb_build_object('contract_version','math-coaching-v1','coaching',math_private.mixed_coaching_projection(r,q,false)));
    else
     q=q||jsonb_build_object('solution_revealed',true);
    end if;
   end if;
   questions=questions||jsonb_build_array(q);
  end loop;
  if mixed then r=jsonb_set(r,'{result}',jsonb_build_object('questions',questions));end if;
  rows=rows||jsonb_build_array(r);
 end loop;
 return jsonb_set(answer,'{runs}',rows);
end$$;
revoke all on function public.essay_exam_history(uuid) from public,anon,authenticated,service_role;
grant execute on function public.essay_exam_history(uuid) to authenticated;

create function public.essay_math_coaching(p_request jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v jsonb=p_request->'payload'; action text=p_request->>'action'; r jsonb; q jsonb; key uuid; old math_private.mixed_coaching_disclosures; answer jsonb;
begin
 if p_request->>'dto_version' is distinct from 'math-coaching-v1' or p_request-array['dto_version','action','payload']<>'{}' or jsonb_typeof(v) is distinct from 'object' or action not in ('read','reveal') or action is null then raise invalid_parameter_value;end if;
 if v-(case when action='reveal' then array['run_id','question_id','client_submission_id'] else array['run_id','question_id'] end)<>'{}' then raise invalid_parameter_value;end if;
 -- The existing History function enforces owner and account lifecycle before any access.
 r=public.essay_exam_history_before_task16g((v->>'run_id')::uuid)->'runs'->0;
 if r is null or r->>'state'<>'completed' then raise insufficient_privilege;end if;
 select value into q from jsonb_array_elements(r->'result'->'questions') where value->>'questionId'=v->>'question_id' and value->'evaluation'->>'contract_version'='math-eval-v1';
 if q is null then raise insufficient_privilege;end if;
 if action='reveal' then
  key=(v->>'client_submission_id')::uuid;if key is null then raise invalid_parameter_value;end if;
  perform pg_advisory_xact_lock(hashtextextended(r->>'id',717));
  select * into old from math_private.mixed_coaching_disclosures where client_key=key;
  if found and (old.run_id<>(r->>'id')::uuid or old.question_id<>(q->>'questionId')::uuid) then raise unique_violation using message='DISCLOSURE_RETRY_CONFLICT';end if;
  insert into math_private.mixed_coaching_disclosures(run_id,question_id,student_id,client_key) values((r->>'id')::uuid,(q->>'questionId')::uuid,auth.uid(),key) on conflict(run_id,question_id) do nothing;
 end if;
 answer=math_private.mixed_coaching_projection(r,q,exists(select 1 from math_private.mixed_coaching_disclosures where run_id=(r->>'id')::uuid and question_id=(q->>'questionId')::uuid and student_id=auth.uid()));
 return jsonb_build_object('dto_version','math-coaching-v1','action',action,'result',answer);
end$$;
revoke all on function public.essay_math_coaching(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.essay_math_coaching(jsonb) to authenticated;

-- END REUSED mixed_disclosure.sql

-- BEGIN REUSED supabase/candidates/task16g_learning_loop/mixed_learning.sql SHA256 7e7eda61529aaa10339c740fe2b09d058e55e5bb5324a175a63c254419bad467
create table math_private.mixed_coaching_hints(
 run_id uuid not null references essay_exam_private.runs(id) on delete cascade,question_id uuid not null,task_id uuid not null,level integer not null check(level in(1,2)),student_id uuid not null,client_key uuid not null unique,delivered_at timestamptz not null,primary key(run_id,question_id,task_id,level)
);
alter table math_private.mixed_coaching_hints enable row level security;
revoke all on math_private.mixed_coaching_hints from public,anon,authenticated,service_role;
create or replace function public.essay_math_coaching(p_request jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v jsonb=p_request->'payload'; action text=p_request->>'action'; r jsonb; q jsonb; key uuid; old math_private.mixed_coaching_disclosures; answer jsonb; task jsonb; old_hint math_private.mixed_coaching_hints; history_row jsonb; attempts jsonb;
begin
 if p_request->>'dto_version' is distinct from 'math-coaching-v1' or p_request-array['dto_version','action','payload']<>'{}' or jsonb_typeof(v) is distinct from 'object' or action not in ('read','reveal','hint','history') or action is null then raise invalid_parameter_value;end if;
 if v-(case when action='hint' then array['run_id','question_id','client_submission_id','task_id','level'] when action='reveal' then array['run_id','question_id','client_submission_id'] else array['run_id','question_id'] end)<>'{}' then raise invalid_parameter_value;end if;
 -- The existing History function enforces owner and account lifecycle before any access.
 r=public.essay_exam_history_before_task16g((v->>'run_id')::uuid)->'runs'->0;
 if r is null or r->>'state'<>'completed' then raise insufficient_privilege;end if;
 select value into q from jsonb_array_elements(r->'result'->'questions') where value->>'questionId'=v->>'question_id' and value->'evaluation'->>'contract_version'='math-eval-v1';
 if q is null then raise insufficient_privilege;end if;
 if action='reveal' then
  key=(v->>'client_submission_id')::uuid;if key is null then raise invalid_parameter_value;end if;
  perform pg_advisory_xact_lock(hashtextextended(r->>'id',717));
  select * into old from math_private.mixed_coaching_disclosures where client_key=key;
  if found and (old.run_id<>(r->>'id')::uuid or old.question_id<>(q->>'questionId')::uuid) then raise unique_violation using message='DISCLOSURE_RETRY_CONFLICT';end if;
  insert into math_private.mixed_coaching_disclosures(run_id,question_id,student_id,client_key) values((r->>'id')::uuid,(q->>'questionId')::uuid,auth.uid(),key) on conflict(run_id,question_id) do nothing;
 end if;
 answer=math_private.mixed_coaching_projection(r,q,exists(select 1 from math_private.mixed_coaching_disclosures where run_id=(r->>'id')::uuid and question_id=(q->>'questionId')::uuid and student_id=auth.uid()));
 if action='hint' then
  key=(v->>'client_submission_id')::uuid;
  if key is null or v->>'level' is null or (v->>'level')::integer not in (1,2) then raise invalid_parameter_value;end if;
  select value into task from jsonb_array_elements(answer->'tasks') where value->>'id'=v->>'task_id';
  if task is null then raise invalid_parameter_value using message='HINT_UNAVAILABLE';end if;
  perform pg_advisory_xact_lock(hashtextextended(key::text,718)); -- Serialize retry key before conflict lookup.
  select * into old_hint from math_private.mixed_coaching_hints where client_key=key;
  if found and (old_hint.run_id<>(r->>'id')::uuid or old_hint.question_id<>(q->>'questionId')::uuid or old_hint.task_id<>(v->>'task_id')::uuid or old_hint.level<>(v->>'level')::integer) then raise unique_violation using message='HINT_RETRY_CONFLICT';end if;
  if (v->>'level')::integer=2 and not exists(select 1 from math_private.mixed_coaching_hints where run_id=(r->>'id')::uuid and question_id=(q->>'questionId')::uuid and task_id=(v->>'task_id')::uuid and level=1 and student_id=auth.uid()) then raise invalid_parameter_value using message='REVEAL_L1_FIRST';end if;
  insert into math_private.mixed_coaching_hints values((r->>'id')::uuid,(q->>'questionId')::uuid,(v->>'task_id')::uuid,(v->>'level')::integer,auth.uid(),key,clock_timestamp()) on conflict(run_id,question_id,task_id,level) do nothing;
  answer=jsonb_build_object('level',(v->>'level')::integer,'body',case when v->>'level'='1' then '사용한 정의·정리의 적용 조건을 원래 문제의 조건과 대조하세요.' else task->>'direction' end);
 elsif action='history' then
  -- Reuse the existing bounded owner History, filtered to this exam/question.
  -- No raw evaluation prose or answer bodies enter this projection.
  attempts='[]';
  for history_row in select value from jsonb_array_elements(public.essay_exam_history_before_task16g(null)->'runs') loop
   if history_row->>'exam_id'=r->>'exam_id' and (history_row->'question_ids') ? (q->>'questionId') then
    attempts=attempts||jsonb_build_array(jsonb_build_object(
     'run_id',history_row->'id','evaluation_state',history_row->'state',
     'resolve_kind',case when history_row->>'parent_id' is null then 'INITIAL' else 'FULL_RESOLVE' end,
     'completed_at',history_row->'completed_at',
     'solution_revealed',exists(select 1 from math_private.mixed_coaching_disclosures where run_id=(history_row->>'id')::uuid and question_id=(q->>'questionId')::uuid and student_id=auth.uid()),
     'exposed_hint_levels',(select coalesce(jsonb_agg(distinct level),'[]') from math_private.mixed_coaching_hints where run_id=(history_row->>'id')::uuid and question_id=(q->>'questionId')::uuid and student_id=auth.uid())));
   end if;
  end loop;
  answer=jsonb_build_object('attempts',attempts);
 end if;
 return jsonb_build_object('dto_version','math-coaching-v1','action',action,'result',answer);
end$$;

-- END REUSED mixed_learning.sql

-- BEGIN REUSED supabase/candidates/task16g_learning_loop/coaching_cycles.sql SHA256 9ca47a4eff8866d9b1bf00273a1b7a0b8050d8624232ba3a5126e715e028e3cd
set role math_executor;
alter function public.math_coaching(jsonb) rename to math_coaching_before_task16g;
revoke all on function public.math_coaching_before_task16g(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.math_coaching_before_task16g(jsonb) to postgres;
reset role;
create function public.math_coaching(p_request jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare answer jsonb; run math_private.session_runs; quote jsonb; can_continue boolean;
begin
 answer=public.math_coaching_before_task16g(p_request);
 if p_request->>'action' not in ('read','reveal') then return answer;end if;
 -- Display only the canonical question label; a leaf_key is an internal identifier.
 answer=jsonb_set(answer,'{result}',answer->'result'||coalesce((
  select jsonb_build_object('exam_label',ps.label||' · '||q.label)
  from public.math_evaluations e join public.math_subproblems s on s.id=e.leaf_id
  join public.math_problems p on p.id=s.problem_id join public.math_problem_sets ps on ps.id=p.problem_set_id
  join public.essay_questions q on q.id=s.essay_question_id and q.essay_exam_id=ps.essay_exam_id
  where e.id=(p_request->'payload'->>'evaluation_id')::uuid
 ),'{}'::jsonb));
 select r.* into run from math_private.session_evaluations x join math_private.session_members m on m.attempt_id=x.attempt_id join math_private.session_runs r on r.id=m.run_id
 where x.evaluation_id=(p_request->'payload'->>'evaluation_id')::uuid and r.student_id=auth.uid();
 if found then
  can_continue=run.state='completed' and not exists(select 1 from math_private.session_runs where previous_run_id=run.id and state<>'cancelled');
  if can_continue then quote=public.math_session_quote(run.id);end if;
  answer=jsonb_set(answer,'{result,rewrite_policy}',coalesce(answer->'result'->'rewrite_policy','{}')||jsonb_build_object('eligible',can_continue and quote->>'credits_required'='0','paid_available',can_continue and quote->>'credits_required'='1','session_run_id',run.id,'exam_id',run.exam_id,'next_quote',quote));
 end if;
 return answer;
end$$;
revoke all on function public.math_coaching(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.math_coaching(jsonb) to authenticated;

-- END REUSED coaching_cycles.sql

reset role;
-- RELEASE57_AFTER_FUNCTIONS
revoke references on public.math_evaluations from math_executor;
revoke create on schema public,math_private from math_executor;
revoke create on schema math_private from essay_executor;
revoke math_executor from postgres granted by postgres;
revoke essay_executor from postgres granted by postgres;
-- Preserve original public math_learning ACL while adding only the internal caller used by coaching.
-- New raw legacy names remain uncallable by authenticated/anon/service_role.
do $post$ declare before record; after record; legacy text; name text; acl_expected text; begin
 if exists((select * from pg_auth_members except select * from release57_original_memberships) union all
  (select * from release57_original_memberships except select * from pg_auth_members)) then raise exception 'RELEASE57_MEMBERSHIP_RESIDUE';end if;
 if exists(select 1 from release57_original_schema_acl b join pg_namespace n using(oid) where b.nspowner<>n.nspowner
  or (select jsonb_agg(x order by x) from unnest(b.nspacl::text[])x) is distinct from (select jsonb_agg(x order by x) from unnest(n.nspacl::text[])x)) then raise exception 'RELEASE57_SCHEMA_ACL_RESIDUE';end if;
 if exists(select 1 from release57_original_table_acl b join pg_class n using(oid) where b.relowner<>n.relowner or b.relrowsecurity<>n.relrowsecurity
  or (select jsonb_agg(x order by x) from unnest(b.relacl::text[])x) is distinct from (select jsonb_agg(x order by x) from unnest(n.relacl::text[])x)) then raise exception 'RELEASE57_TABLE_ACL_RESIDUE';end if;
 for before in select * from release57_original_functions loop
  select pg_get_userbyid(p.proowner) owner,p.proconfig config,p.prosecdef secdef into after from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=before.nspname and p.proname=before.proname;
  if after.owner<>before.owner or after.config is distinct from before.config or after.secdef<>before.secdef then raise exception 'RELEASE57_PUBLIC_OWNER_SECURITY_DRIFT: %',before.proname;end if;
 end loop;
 foreach name in array array['math_evaluation_detail_task16f_legacy(uuid)','math_reveal_hint_task16f_legacy(uuid,uuid)','math_learning_task16f_legacy(jsonb)','math_session_read_before_task16g(uuid)','essay_exam_history_before_task16g(uuid)','math_coaching_before_task16g(jsonb)'] loop
  if has_function_privilege('anon','public.'||name,'EXECUTE') or has_function_privilege('authenticated','public.'||name,'EXECUTE') or has_function_privilege('service_role','public.'||name,'EXECUTE') then raise exception 'RELEASE57_RAW_RPC_EXPOSED: %',name;end if;
 end loop;
 foreach name in array array['math_coaching(jsonb)','essay_math_coaching(jsonb)','math_session_quote(uuid)','math_session_continue(uuid,uuid,uuid[],uuid,integer)'] loop
  if not has_function_privilege('authenticated','public.'||name,'EXECUTE') or has_function_privilege('anon','public.'||name,'EXECUTE') or has_function_privilege('service_role','public.'||name,'EXECUTE') then raise exception 'RELEASE57_PUBLIC_RPC_ACL_DRIFT: %',name;end if;
 end loop;
 if exists(select 1 from pg_class where oid in('math_private.coaching_disclosures'::regclass,'math_private.mixed_coaching_disclosures'::regclass,'math_private.mixed_coaching_hints'::regclass) and not relrowsecurity) then raise exception 'RELEASE57_DISCLOSURE_RLS_DISABLED';end if;
end $post$;
-- RELEASE57_BEFORE_COMMIT
notify pgrst, 'reload schema';
commit;
