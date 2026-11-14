-- LOCAL EMPTY DISPOSABLE DATABASE ONLY. Auth/official-admin gates are synthetic stubs.
create schema auth;
create schema account_private;
create schema essay_exam_private;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
create function account_private.allowed(uuid) returns boolean language sql as $$select coalesce(nullif(current_setting('test.allowed',true),''),'true')::boolean$$;
create function public.admin_operator() returns boolean language sql as $$select coalesce(nullif(current_setting('test.admin',true),''),'false')::boolean$$;
grant usage on schema auth to anon,authenticated,service_role;
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
create table public.credit_accounts(id uuid primary key default gen_random_uuid(),user_id uuid);
insert into public.credit_accounts(user_id) values('00000000-0000-4000-8000-000000000002');
create table public.universities(id uuid primary key,name text);
create table public.essay_exams(id uuid primary key,university_id uuid,exam_name text);
create table essay_exam_private.runs(id uuid primary key,account_id uuid,exam_id uuid,parent_id uuid,state text,snapshot jsonb,result jsonb,created_at timestamptz default now());
