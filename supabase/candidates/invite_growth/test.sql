-- Read-only validation design for invite_growth (run BEFORE any apply; no writes).
-- 1) Token/hash shape: 64-hex token, sha256 hex 64 — verified read-only.
select (replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')) ~ '^[0-9a-f]{64}$' as token_ok,
       length(encode(sha256('x'::bytea),'hex'))=64 as hash_ok;

-- 2) First-study detection matches the existing study policy (include_in_study_total +
--    an active_segment with end>start). Validate against a real user (no writes).
with u as (select user_id from public.study_sessions where include_in_study_total group by user_id order by count(*) desc limit 1),
p as (select created_at signup_at from public.profiles where id=(select user_id from u))
select (select user_id from u) is not null as user_found,
  (select min(s.started_at) from public.study_sessions s, p
     where s.user_id=(select user_id from u) and s.include_in_study_total and s.started_at>=p.signup_at
       and exists (select 1 from jsonb_array_elements(s.active_segments) seg where (seg->>1)::bigint>(seg->>0)::bigint)) as first_study_at;

-- 3) D7 boundary (KST): signup day + 7 days, [D7 00:00, D7+1 00:00) KST.
with p as (select created_at signup_at from public.profiles where created_at is not null order by created_at desc limit 1)
select (date_trunc('day',(signup_at at time zone 'Asia/Seoul'))+interval '7 days') at time zone 'Asia/Seoul' as d7_start_kst from p;

-- 4) Schema conflict: confirm no existing invite* tables (expect empty).
select string_agg(table_name,', ') as existing_invite_tables
from information_schema.tables where table_schema='public' and table_name ~* 'invite';
