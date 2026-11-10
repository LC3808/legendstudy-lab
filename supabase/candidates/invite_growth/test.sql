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

-- 5) 비로그인 RPC 응답 최소화·보안 (적용 후 실행 시나리오; 여기서는 설계 불변식만 명시):
--    invite_lookup: 반환은 {valid, office_code, school_code, has_school, campaign}뿐 — 초대자 신원/회원/학습 데이터 미포함.
--    invite_record_visit: 반환은 {recorded}뿐. 둘 다 p_token은 ^[0-9a-f]{64}$ 정규식 검증(동적 SQL 없음=SQLi 불가).
--    토큰 대량 조회: 64-hex=128bit → 열거 불가. 만료/폐기 토큰은 lookup/visit/attribute 모두 거부.
-- 6) 첫 학습/D7 실시간 재계산 정합(적용 후): 아래는 저장 컬럼 없이 study_sessions만으로 집계됨을 보이는 읽기전용 예시.
with at as (select p.id invited_user_id, p.created_at signup_at from public.profiles p
            where p.id in (select user_id from public.study_sessions where include_in_study_total group by user_id order by count(*) desc limit 5)),
ms as (select at.*,
    exists(select 1 from public.study_sessions s where s.user_id=at.invited_user_id and s.include_in_study_total and s.started_at>=at.signup_at
      and exists(select 1 from jsonb_array_elements(s.active_segments) g where (g->>1)::bigint>(g->>0)::bigint)) first_study,
    ((date_trunc('day',(at.signup_at at time zone 'Asia/Seoul'))+interval '7 days') at time zone 'Asia/Seoul') d7_start from at),
ms2 as (select *, now()>=d7_start+interval '1 day' d7_obs from ms)
select count(*) signups, count(*) filter (where first_study) first_study, count(*) filter (where d7_obs) d7_eligible from ms2;
