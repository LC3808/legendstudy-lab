-- CANDIDATE — NOT applied to production. Owner approval required before apply_migration.
-- Phase 3: 친구 초대 · 가입 전환 · 첫 학습 · D7 유지 추적.
--
-- 설계 원칙
--   * 초대 토큰은 서버 발급 불투명 난수. 외부 URL에 raw token만 노출하고 DB에는 sha256 해시만 저장.
--     토큰은 "식별/공유"용이며 권한 부여 수단이 아니다(어떤 데이터 접근 권한도 주지 않는다).
--   * 외부 URL/로그에 내부 UUID·이메일·전화 등 개인정보 비노출.
--   * 집계 기준(참여/공부시간)은 기존 정책 재사용: study_sessions.include_in_study_total,
--     active_segments 기반 실제 인정 공부시간 > 0. 신규 집계 기준을 만들지 않는다.
--   * signup_at = profiles.created_at(프로필 생성=가입 시점, 기존 트리거 체계와 일치).
--   * 자기 초대/자기 가입 전환 제외, 신규 가입자 1회만 귀속(중복 금지), 귀속 기간 7일.
--   * 기존 인증/프로필/공부시간 구조 재사용. 신규 인증 체계 없음.
--
-- BEFORE APPLY: 스키마 충돌 확인(기존 invite* 테이블 없음 확인됨), RLS/권한 검토,
--   운영 규모 성능 확인, get_advisors 신규 권고 0, Owner 승인.

-- ───────────────────────────── 테이블 ─────────────────────────────
create table if not exists public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,                 -- sha256(raw token) hex. raw는 저장하지 않음.
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  office_code text,                                 -- 초대 시점 초대자 학교(널 허용: 학교 미등록 초대자)
  school_code text,
  campaign text not null default 'school_rank',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  revoked_at timestamptz
);
create index if not exists invite_tokens_inviter_idx on public.invite_tokens(inviter_user_id, created_at desc);
create index if not exists invite_tokens_school_idx on public.invite_tokens(office_code, school_code);

create table if not exists public.invite_visits (
  id uuid primary key default gen_random_uuid(),
  invite_token_id uuid not null references public.invite_tokens(id) on delete cascade,
  visitor_hash text not null,                       -- 클라이언트 발급 불투명 난수의 해시(개인정보 아님). 방문 중복 제거용.
  source text,                                      -- 'web' | 'app' | ...
  visited_at timestamptz not null default now(),
  unique (invite_token_id, visitor_hash)            -- 동일 토큰·동일 방문자 1행(중복 방문 집계 금지)
);
create index if not exists invite_visits_token_idx on public.invite_visits(invite_token_id, visited_at);

create table if not exists public.invite_attributions (
  id uuid primary key default gen_random_uuid(),
  invite_token_id uuid not null references public.invite_tokens(id) on delete cascade,
  invited_user_id uuid not null unique references auth.users(id) on delete cascade,  -- 신규 가입자 1회만 귀속
  signup_at timestamptz not null,
  school_confirmed_at timestamptz,
  first_study_at timestamptz,
  d7_retained_at timestamptz,
  d7_evaluated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists invite_attributions_token_idx on public.invite_attributions(invite_token_id);

alter table public.invite_tokens enable row level security;
alter table public.invite_visits enable row level security;
alter table public.invite_attributions enable row level security;
-- 모든 쓰기/민감 조회는 아래 SECURITY DEFINER RPC로만. 테이블 직접 접근 정책은 두지 않는다(기본 거부).
-- 초대자는 본인 토큰 성과를 RPC(invite_my_performance)로만 조회. invitee는 본인 귀속만 RPC로 조회.

-- ───────────────────────────── RPC ─────────────────────────────

-- 1) 초대 링크 생성(로그인 사용자). raw token은 1회 반환, 서버는 해시만 저장.
create or replace function public.invite_create(p_campaign text default 'school_rank')
returns jsonb language plpgsql security definer set search_path to '' set statement_timeout to '5s' as $fn$
declare v_uid uuid := auth.uid(); v_office text; v_school text; v_raw text; v_id uuid; v_exp timestamptz;
begin
  if v_uid is null or not account_private.allowed(v_uid) then raise insufficient_privilege; end if;
  if coalesce(p_campaign,'') !~ '^[a-z0-9_]{1,40}$' then p_campaign := 'school_rank'; end if;
  select neis_office_code, neis_school_code into v_office, v_school from public.profiles where id = v_uid;
  -- 불투명 난수(코어 gen_random_uuid 2개=128bit). pgcrypto 의존 없이 추측 난이도 확보.
  v_raw := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  v_exp := now() + interval '90 days';
  insert into public.invite_tokens(token_hash, inviter_user_id, office_code, school_code, campaign, expires_at)
  values (encode(sha256(v_raw::bytea),'hex'), v_uid, v_office, v_school, p_campaign, v_exp)
  returning id into v_id;
  return jsonb_build_object('version','invite-create-v1','token', v_raw, 'path', '/invite/?t='||v_raw,
                            'campaign', p_campaign, 'expires_at', v_exp, 'has_school', v_office is not null and v_school is not null);
end $fn$;

-- 2) 초대 링크 조회(비로그인 허용). 유효성 + 학교 식별코드만 반환. 초대자 신원·개인정보 비노출.
create or replace function public.invite_lookup(p_token text)
returns jsonb language plpgsql security definer set search_path to '' set statement_timeout to '5s' as $fn$
declare v_row public.invite_tokens; begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return jsonb_build_object('version','invite-lookup-v1','valid',false,'reason','invalid'); end if;
  select * into v_row from public.invite_tokens where token_hash = encode(sha256(p_token::bytea),'hex');
  if v_row.id is null then return jsonb_build_object('version','invite-lookup-v1','valid',false,'reason','not_found'); end if;
  if v_row.revoked_at is not null then return jsonb_build_object('version','invite-lookup-v1','valid',false,'reason','revoked'); end if;
  if v_row.expires_at <= now() then return jsonb_build_object('version','invite-lookup-v1','valid',false,'reason','expired'); end if;
  return jsonb_build_object('version','invite-lookup-v1','valid',true,
    'office_code', v_row.office_code, 'school_code', v_row.school_code,   -- 공개 학교 식별자(널 허용)
    'has_school', v_row.office_code is not null and v_row.school_code is not null, 'campaign', v_row.campaign);
end $fn$;

-- 3) 초대 방문 기록(비로그인 허용). visitor는 클라이언트 난수 해시(개인정보 아님). 토큰·방문자 중복 1행.
create or replace function public.invite_record_visit(p_token text, p_visitor text, p_source text default 'web')
returns jsonb language plpgsql security definer set search_path to '' set statement_timeout to '5s' as $fn$
declare v_id uuid; begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' or p_visitor is null or length(p_visitor) not between 8 and 128 then
    return jsonb_build_object('version','invite-visit-v1','recorded',false); end if;
  select id into v_id from public.invite_tokens
    where token_hash = encode(sha256(p_token::bytea),'hex') and revoked_at is null and expires_at > now();
  if v_id is null then return jsonb_build_object('version','invite-visit-v1','recorded',false); end if;
  insert into public.invite_visits(invite_token_id, visitor_hash, source)
  values (v_id, encode(sha256(p_visitor::bytea),'hex'), coalesce(nullif(p_source,''),'web'))
  on conflict (invite_token_id, visitor_hash) do nothing;
  return jsonb_build_object('version','invite-visit-v1','recorded',true);
end $fn$;

-- 4) 가입 전환 귀속(로그인 신규 사용자 본인). 자기초대/기존회원/중복 방지. 7일 귀속 기간.
create or replace function public.invite_attribute_signup(p_token text)
returns jsonb language plpgsql security definer set search_path to '' set statement_timeout to '5s' as $fn$
declare v_uid uuid := auth.uid(); v_tok public.invite_tokens; v_signup timestamptz; begin
  if v_uid is null or not account_private.allowed(v_uid) then raise insufficient_privilege; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return jsonb_build_object('version','invite-attr-v1','attributed',false,'reason','invalid'); end if;
  select created_at into v_signup from public.profiles where id = v_uid;         -- 가입 시점
  select * into v_tok from public.invite_tokens where token_hash = encode(sha256(p_token::bytea),'hex');
  if v_tok.id is null or v_tok.revoked_at is not null or v_tok.expires_at <= now()
     then return jsonb_build_object('version','invite-attr-v1','attributed',false,'reason','token_invalid'); end if;
  if v_tok.inviter_user_id = v_uid then return jsonb_build_object('version','invite-attr-v1','attributed',false,'reason','self_invite'); end if;
  if exists (select 1 from public.invite_attributions where invited_user_id = v_uid)
     then return jsonb_build_object('version','invite-attr-v1','attributed',true,'reason','already'); end if;  -- 멱등
  -- 신규 가입 판정: 가입이 토큰 생성 이후 & 7일 귀속 기간 이내.
  if v_signup is null or v_signup < v_tok.created_at or v_signup > now() + interval '1 minute'
     or now() - v_signup > interval '7 days'
     then return jsonb_build_object('version','invite-attr-v1','attributed',false,'reason','not_new_signup'); end if;
  insert into public.invite_attributions(invite_token_id, invited_user_id, signup_at)
  values (v_tok.id, v_uid, v_signup) on conflict (invited_user_id) do nothing;
  return jsonb_build_object('version','invite-attr-v1','attributed',true,'reason','ok',
    'office_code', v_tok.office_code, 'school_code', v_tok.school_code,
    'has_school', v_tok.office_code is not null and v_tok.school_code is not null);
end $fn$;

-- 5) 학교 확인 기록(로그인 본인). 학교 설정은 기존 profiles 경로로 하고, 이 RPC는 확인 시각만 기록.
create or replace function public.invite_mark_school_confirmed()
returns jsonb language plpgsql security definer set search_path to '' set statement_timeout to '5s' as $fn$
declare v_uid uuid := auth.uid(); begin
  if v_uid is null or not account_private.allowed(v_uid) then raise insufficient_privilege; end if;
  update public.invite_attributions set school_confirmed_at = coalesce(school_confirmed_at, now())
    where invited_user_id = v_uid;
  return jsonb_build_object('version','invite-school-v1','ok', found);
end $fn$;

-- 6) 마일스톤 갱신(본인). 첫 학습(가입 이후 최초 유효 공부시간)·D7 유지 재계산. 멱등.
create or replace function public.invite_refresh_milestones()
returns jsonb language plpgsql security definer set search_path to '' set statement_timeout to '8s' as $fn$
declare v_uid uuid := auth.uid(); v_attr public.invite_attributions; v_first timestamptz; v_d7 timestamptz;
        v_d7_start timestamptz; v_d7_end timestamptz; begin
  if v_uid is null or not account_private.allowed(v_uid) then raise insufficient_privilege; end if;
  select * into v_attr from public.invite_attributions where invited_user_id = v_uid;
  if v_attr.id is null then return jsonb_build_object('version','invite-ms-v1','ok',false); end if;
  -- 첫 학습: 가입 이후 실제 인정 공부시간(>0)이 있는 최초 세션 시각.
  if v_attr.first_study_at is null then
    select min(s.started_at) into v_first from public.study_sessions s
      where s.user_id = v_uid and s.include_in_study_total and s.started_at >= v_attr.signup_at
        and exists (select 1 from jsonb_array_elements(s.active_segments) seg where (seg->>1)::bigint > (seg->>0)::bigint);
    if v_first is not null then update public.invite_attributions set first_study_at = v_first where id = v_attr.id; end if;
  end if;
  -- D7: 가입 D0(KST) 기준 7일째 날짜에 유효 공부시간 기록 존재 여부. 관찰 기간 미도래면 미평가.
  v_d7_start := (date_trunc('day', (v_attr.signup_at at time zone 'Asia/Seoul')) + interval '7 days') at time zone 'Asia/Seoul';
  v_d7_end := v_d7_start + interval '1 day';
  if now() >= v_d7_end and v_attr.d7_evaluated_at is null then
    select min(s.started_at) into v_d7 from public.study_sessions s
      where s.user_id = v_uid and s.include_in_study_total and s.started_at >= v_d7_start and s.started_at < v_d7_end
        and exists (select 1 from jsonb_array_elements(s.active_segments) seg where (seg->>1)::bigint > (seg->>0)::bigint);
    update public.invite_attributions set d7_retained_at = v_d7, d7_evaluated_at = now() where id = v_attr.id;
  end if;
  return jsonb_build_object('version','invite-ms-v1','ok',true);
end $fn$;

-- 공통: 귀속자별 첫 학습/D7을 study_sessions에서 "실시간" 재계산한다(저장 컬럼 비의존).
--   → 특정 페이지 방문 없이도 집계 정확, 기록 삭제·수정 시 즉시 정합. 저장 컬럼(first_study_at,
--   d7_retained_at)은 선택적 캐시일 뿐 집계의 근거가 아니다. D7은 관찰 기간(가입+7일 KST) 도래분만 분모.

-- 7) 내 초대 성과(초대자 본인). 집계 수치만. 피초대자 개인정보/개인 학습기록 비공개.
create or replace function public.invite_my_performance()
returns jsonb language plpgsql security definer set search_path to '' set statement_timeout to '8s' as $fn$
declare v_uid uuid := auth.uid(); result jsonb; begin
  if v_uid is null or not account_private.allowed(v_uid) then raise insufficient_privilege; end if;
  with my as (select id from public.invite_tokens where inviter_user_id = v_uid),
  v as (select count(distinct iv.visitor_hash) visits from public.invite_visits iv where iv.invite_token_id in (select id from my)),
  at as (select a.invited_user_id, a.signup_at from public.invite_attributions a where a.invite_token_id in (select id from my)),
  ms as (select at.*,
      exists(select 1 from public.study_sessions s where s.user_id=at.invited_user_id and s.include_in_study_total and s.started_at>=at.signup_at
        and exists(select 1 from jsonb_array_elements(s.active_segments) g where (g->>1)::bigint>(g->>0)::bigint)) first_study,
      ((date_trunc('day',(at.signup_at at time zone 'Asia/Seoul'))+interval '7 days') at time zone 'Asia/Seoul') d7_start from at),
  ms2 as (select *, now()>=d7_start+interval '1 day' d7_obs,
      case when now()>=d7_start+interval '1 day' then exists(select 1 from public.study_sessions s where s.user_id=invited_user_id and s.include_in_study_total and s.started_at>=d7_start and s.started_at<d7_start+interval '1 day'
        and exists(select 1 from jsonb_array_elements(s.active_segments) g where (g->>1)::bigint>(g->>0)::bigint)) else false end d7_ret from ms)
  select jsonb_build_object('version','invite-perf-v1',
    'tokens',(select count(*) from my),'visits',(select visits from v),
    'signups',(select count(*) from ms2),
    'first_study',(select count(*) filter (where first_study) from ms2),
    'd7_eligible',(select count(*) filter (where d7_obs) from ms2),
    'd7_retained',(select count(*) filter (where d7_ret) from ms2)
  ) into result; return result;
end $fn$;

-- 8) 관리자 초대 성과 집계(관리자 전용). 전체 + 학교별. 첫 학습·D7 실시간 재계산(저장 컬럼 비의존).
create or replace function public.admin_invite_growth(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql security definer set search_path to '' set statement_timeout to '8s' as $fn$
declare result jsonb; begin
  if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege; end if;
  if p_from is null or p_to is null or p_to <= p_from then raise sqlstate 'PT422' using message='INVALID_PERIOD'; end if;
  with tk as (select * from public.invite_tokens where created_at >= p_from and created_at < p_to),
  vis as (select count(distinct visitor_hash) c from public.invite_visits where invite_token_id in (select id from tk)),
  at as (select a.invited_user_id, a.signup_at, t.id token_id from public.invite_attributions a join tk t on t.id = a.invite_token_id),
  ms as (select at.*,
      exists(select 1 from public.study_sessions s where s.user_id=at.invited_user_id and s.include_in_study_total and s.started_at>=at.signup_at
        and exists(select 1 from jsonb_array_elements(s.active_segments) g where (g->>1)::bigint>(g->>0)::bigint)) first_study,
      ((date_trunc('day',(at.signup_at at time zone 'Asia/Seoul'))+interval '7 days') at time zone 'Asia/Seoul') d7_start from at),
  ms2 as (select *, now()>=d7_start+interval '1 day' d7_obs,
      case when now()>=d7_start+interval '1 day' then exists(select 1 from public.study_sessions s where s.user_id=invited_user_id and s.include_in_study_total and s.started_at>=d7_start and s.started_at<d7_start+interval '1 day'
        and exists(select 1 from jsonb_array_elements(s.active_segments) g where (g->>1)::bigint>(g->>0)::bigint)) else false end d7_ret from ms),
  byschool as (
    select t.office_code, t.school_code, count(distinct t.id) tokens,
      count(m.invited_user_id) signups,
      count(*) filter (where m.first_study) first_study,
      count(*) filter (where m.d7_ret) d7
    from tk t left join ms2 m on m.token_id = t.id
    group by t.office_code, t.school_code)
  select jsonb_build_object('version','admin-invite-growth-v1','as_of',statement_timestamp(),
    'tokens',(select count(*) from tk),'visits',(select c from vis),
    'signups',(select count(*) from ms2),
    'first_study',(select count(*) filter (where first_study) from ms2),
    'first_study_rate', case when (select count(*) from ms2)>0 then round(100.0*(select count(*) filter (where first_study) from ms2)/(select count(*) from ms2),1) else 0 end,
    'd7_eligible',(select count(*) filter (where d7_obs) from ms2),
    'd7_retained',(select count(*) filter (where d7_ret) from ms2),
    'd7_rate', case when (select count(*) filter (where d7_obs) from ms2)>0 then round(100.0*(select count(*) filter (where d7_ret) from ms2)/(select count(*) filter (where d7_obs) from ms2),1) else 0 end,
    'schools', coalesce((select jsonb_agg(jsonb_build_object('office_code',office_code,'school_code',school_code,'tokens',tokens,'signups',signups,'first_study',first_study,'d7',d7) order by signups desc) from byschool),'[]'::jsonb)
  ) into result; return result;
end $fn$;

-- 9) 내 초대 토큰 폐기(본인). 폐기 후 lookup/visit/attribute 모두 거부. 멱등.
create or replace function public.invite_revoke_mine()
returns jsonb language plpgsql security definer set search_path to '' set statement_timeout to '5s' as $fn$
declare v_uid uuid := auth.uid(); v_n int; begin
  if v_uid is null or not account_private.allowed(v_uid) then raise insufficient_privilege; end if;
  update public.invite_tokens set revoked_at = now() where inviter_user_id = v_uid and revoked_at is null;
  get diagnostics v_n = row_count;
  return jsonb_build_object('version','invite-revoke-v1','revoked', v_n);
end $fn$;

-- 권한: 생성/귀속/성과/폐기는 authenticated. 조회/방문 기록은 anon도 허용(링크 랜딩). 관리자 집계는 authenticated(내부 operator 게이트).
revoke all on function public.invite_create(text), public.invite_attribute_signup(text), public.invite_mark_school_confirmed(),
  public.invite_refresh_milestones(), public.invite_my_performance(), public.invite_revoke_mine(), public.admin_invite_growth(timestamptz,timestamptz) from public, anon;
grant execute on function public.invite_create(text), public.invite_attribute_signup(text), public.invite_mark_school_confirmed(),
  public.invite_refresh_milestones(), public.invite_my_performance(), public.invite_revoke_mine(), public.admin_invite_growth(timestamptz,timestamptz) to authenticated;
revoke all on function public.invite_lookup(text), public.invite_record_visit(text,text,text) from public;
grant execute on function public.invite_lookup(text), public.invite_record_visit(text,text,text) to anon, authenticated;
