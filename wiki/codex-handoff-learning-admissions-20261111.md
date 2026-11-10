# LegendStudy+ 학습·입시 기능 개발 최종 보고 및 인수인계 (Codex, 2026-11-11)

> 작성 2026-11-10 · 대상: 2026-11-11 오전 투입 Codex · 목적: 현재 WEB 개발/운영 상태를
> 정확히 파악해 Flutter APP 개발과 입시 기능 확장을 **중복 없이** 이어가기.
> 본 문서는 Wiki 기록과 **실제 코드·운영 DB 상태를 교차검증**해 작성했다. 운영 DB·RPC·WEB·APP 변경 없음(문서만).
> 세부 시계열은 [school-study-growth-strategy-20261109.md](school-study-growth-strategy-20261109.md) §12–§33.

## 레포 경계 (중요)
- **본 레포 = WEB** (`legendstudy-lab`, Next.js 16 static export → Cloudflare Pages). Flutter 마커(`pubspec.yaml`) 없음.
- **Flutter APP = 별도 레포.** `wiki/index.md` 명시: "The APP repository `wiki/` remains the canonical Unified Wiki." → 본 문서의 **APP 반영 여부는 본 WEB 레포에서 검증 불가**. "APP 미확인"으로 표기한 항목은 APP 레포 wiki와 교차 확인 필요.

## 상태 표기 범례
- ✅ **운영 적용·검증 완료** — 코드 + 운영 배포/적용 + 읽기전용 검증 끝
- 🟡 **WEB 구현·운영 적용, 실사용 E2E 미검증** — 배포됐으나 실제 사용자 세션 E2E 미확인
- ⚪ **미반영 / 별도 레포 / 확인 필요**
- 🔴 **미검증 (NOT TESTED)** — 운영자 세션 등 전제 조건이 없어 이번에 검증 못 함

## 운영 기준선 (롤백 기준)
- **WEB canonical: `9788a7ca`** (git `0eefc7d`) — 최신. 직전 `c94a93e7`(git `843f23d`).
- Supabase project: `stlhijzpjfgwwdgunlsd`. 배포 방식: **/admin·/school 선별 오버레이**(off-scope 0 하드페일) 또는 전역(초대). Functions(worker) 24 route, `functions/`는 `f1d7100` 이후 불변.
- 이번 아크 적용 마이그레이션: `student_school`(v1→v4), `invite_growth_v1`, `admin_admissions_analytics_v1`, `admin_admission_outcomes_v1`, `admin_applications_list_v1`, `admin_study_by_school`.

---

## 1. 학습시간 기록 및 집계 구조 ✅(구조) / 🟡(수집 주체 APP)
- 테이블 `study_sessions`: `user_id, mode, subject, title, planned_duration_seconds, started_at, ended_at, active_segments jsonb, duration_seconds int, include_in_study_total bool, created_at`.
- `active_segments` = `[start_ms, end_ms]` 배열(일시정지 반영). 집계는 **range dedup**으로 사용자별 겹침 제거.
- 순수 helper `study_active_milliseconds(p_segments jsonb, p_span_ms numeric)`(SECURITY INVOKER) — 세그먼트 유효 학습시간 계산.
- 학생 요약 RPC `my_study_summary()`.
- `include_in_study_total=false`면 총합·랭킹 제외(비학습/보정 세션).
- ⚪ **세션 생성(기록) 주체는 주로 APP.** WEB은 집계·표시 중심. APP 통합 시 이 스키마/플래그 계약을 그대로 따를 것.

## 2. 학교별 공부 순위 (Growth) ✅
- RPC `student_school_ranking(p_period text, p_metric text)`, `student_school_card()` — SECURITY DEFINER, authenticated.
- v1→v4 반복으로 확정된 정책: **기본 지표 = 참여 학생 수(participation)**, 기본 기간 = **전체 기간**, TOP10 + 내 학교 주변 순위(동점 tie-aware), 학생 수 수치 **전면 비공개**(마스킹), 타 학교 등록 정보 마스킹.
- WEB `/school`(탭 기본=참여, 탭명 변경 반영). 운영 배포 `4986657a`(§24). 관리자측 `admin_study_by_school(p_from,p_to,p_grade,p_min_users)`.
- k-익명성: 공개 임계값(3) 서버 강제. §19–§24.

## 3. 학교별 참여 학생 수 공개 정책 ✅
- **카운트(참여 학생 수)는 공개 가능, 개별 학습시간/신원은 비공개.** 공개 임계값 미만은 시간 마스킹.
- 참여 학생 수 자체 수치도 UI에서 비공개 처리(순위/상대 위치만). Owner 확정(§21–§23).

## 4. 친구 초대 및 가입 전환 추적 (Phase 3) ✅(적용) / 🔴(퍼널 실사용 미검증)
- 테이블: `invite_tokens`(token_hash, inviter_user_id, office_code, school_code, campaign, expires_at, revoked_at), `invite_visits`(visitor_hash, source, visited_at), `invite_attributions`(invited_user_id, signup_at, school_confirmed_at, first_study_at, d7_retained_at, d7_evaluated_at).
- RPC 9종: `invite_create(campaign)`, `invite_lookup(token)`**[anon]**, `invite_record_visit(token,visitor,source)`**[anon]**, `invite_attribute_signup(token)`, `invite_mark_school_confirmed()`, `invite_refresh_milestones()`, `invite_my_performance()`, `invite_revoke_mine()`, 관리자 `admin_invite_growth(from,to)`.
- 퍼널: 방문→가입→학교 확인→첫 학습→D7 유지. 마일스톤은 **서버측 재계산**(`invite_refresh_milestones`).
- WEB `/invite` 랜딩 + 앱 전역 `InviteAttributionWatcher`(layout.tsx 마운트). **전역 배포 `8243116d`**(§27).
- 🔴 실제 초대자→피초대자 전환 퍼널 E2E 미검증(합성 데이터만).

## 5. 희망 대학·전공 데이터 구조 ✅(WEB) / 입력=직접 insert
- 테이블 `student_target_universities`: `user_id, university_id, admission_year, admission_type, intended_division, priority smallint, status text, source text`.
- **입력 경로 = PostgREST 직접 테이블 insert**(RPC 아님): WEB `src/lib/my/data.ts` → `client.from('student_target_universities').insert({user_id, university_id, status:'interested', source:'my', intended_division})`. RLS로 본인 소유만.
- `priority` = 희망 순위(1지망 등), `status='interested'` 조회 필터, `source='my'` = WEB 입력.
- 관리자 집계: `admin_admissions_analytics`가 희망(target) 섹션으로 읽음(1지망/대학/전공 분포).
- ⚠️ **실제지원(§6)과 다른 아키텍처**임에 유의: 희망=직접테이블+RLS, 실제지원=RPC+이벤트소싱.

## 6. 실제 지원 대학·학과·전형 데이터 구조 ✅(WEB)
- 테이블 `student_applications`: `user_id, admission_year smallint, university_id, university_name_snapshot, intended_division, admission_type, admission_name, revision int, created_at, updated_at`. (대학명 스냅샷 보존.)
- 쓰기 RPC(이벤트소싱): `my_application_save(id,revision,year,university,division,admission_type,admission_name,request_key)`, 조회 `my_applications(offset)` / `my_application_events(id,offset)`, 삭제 `my_application_delete(id)`.
- WEB `src/components/my/applications.tsx`(+ `src/lib/my/foundation.ts` 래퍼). 고3·N수 대상.

## 7. 실제 지원 중복 허용 및 방지 정책 ✅
- **중복 허용**: `student_applications`에 `(user_id, university_id, ...)` **unique 제약 없음**(PK=id, UNIQUE(id,user_id)만). → **같은 대학에 복수 전형·학과 지원 가능**(정상 입시 행태).
- **중복 방지(멱등)**: 이벤트 레벨에서만. `student_application_events`:
  - `UNIQUE(user_id, request_key)` — 클라이언트 재시도 멱등(같은 request_key 재삽입 차단).
  - `UNIQUE(supersedes_event_id)` — 한 이벤트는 한 번만 대체(supersede 체인 분기 방지).
  - CHECK `supersedes_event_id <> id`. FK (application_id,user_id)→student_applications, self-FK supersede 체인.

## 8. 합격 결과 이벤트 및 합격 이력 보존 정책 ✅
- `student_application_events.kind` CHECK 10종: `created, details_changed, planned, submitted, stage_pass, accepted, additional_acceptance, rejected, not_registered, registered`.
- **현재 상태** = created/details_changed 제외 + **미대체(supersedes 없음)** 최신 이벤트(`coalesce(occurred_at,recorded_at) desc`).
- **합격 이력 보존(Owner 확정, §31)**: 최종 합격 = 지원 건에 `accepted|additional_acceptance`(미대체)가 **과거 1회라도 존재**(EXISTS). 이후 `registered/not_registered`가 와도 **합격 사실은 보존**. 현재상태만 보지 않음. `stage_pass`는 최종합격에 미포함(별도).
- 두 합격률(분모 0 → '집계 전'): A. 지원건 합격률 = 최종합격÷(최종합격+불합격), B. 학생 합격경험률 = 합격경험학생÷결과입력학생. 자기신고(`self_reported:true`).

## 9. 관리자 학습·입시 분석 ✅
- 대시보드 3분할(§28–§31): **희망 대학·전공 현황** / **실제 지원 현황·고3·N수** / **입시 성과·합격 현황**.
- RPC(모두 SECURITY DEFINER, `admin_operator()`+`account_private.allowed()` 게이트, authenticated grant):
  - `admin_admissions_analytics(from,to)` — 희망 + 실제지원 커버리지.
  - `admin_admission_outcomes(from,to)` — 합격현황/합격률(§8 정책).
  - `admin_learning_analytics(from,to)`, `admin_exam_learning(from,to)`, `admin_dashboard_study(from,to)`, `admin_study_by_school(...)`, `admin_student360(account)`.
- ⚠️ 집계 운영 주의: **운영자/스태프 계정 데이터가 섞일 수 있음.** 현재 실제지원 2건은 `is_admin=true,is_operator=true` "관리자" 테스트 계정 입력(실학생 아님). 차기 집계에서 operator 제외 검토 권고(§32 읽기전용 검증).
- 대시보드 기본 기간 = 최근 30일. 실제지원/합격은 희소·기간 밖으로 쉽게 0 표시될 수 있음(기간 확장 검토 후보).

## 10. 개별 지원 목록 (누가·어디에 지원) ✅ (이번 세션 최종 작업)
- RPC `admin_applications_list(p_offset)` — operator 전용(개인 식별 포함, 엄격 게이트), SECURITY DEFINER, `search_path=''`, 25/페이지, **기간 필터 없음**(로스터=전체).
- 반환: 학생명·학교(office/school code)·재학상태/학년·대학·학과(intended_division)·전형구분/전형명·학년도·현재상태·`ever_accepted`(합격 이력 보존 표시).
- WEB `src/components/admin/admin-applications-roster.tsx` → `/admin/data/learning`·`/admin/data/applications` 섹션. 적용+배포 `9788a7ca`(§33). 비operator 호출 `42501` 차단 확인.

## 11. 운영 RPC·테이블·권한 구조 ✅
- **게이트**: `admin_operator()`(operator 여부) + `account_private.allowed(auth.uid())`(계정 유효성). 모든 admin RPC 내부 선두에서 미통과 시 `insufficient_privilege(42501)`.
- **공통 계약**: SECURITY DEFINER + `set search_path=''` + `set statement_timeout` + 스키마 한정 참조(`public.*`, `account_private.*`).
- **학생 RPC**(authenticated, 본인 소유): `my_applications, my_application_save, my_application_event, my_application_events, my_application_delete, my_study_summary, student_school_card, student_school_ranking`, invite 8종(anon: `invite_lookup`, `invite_record_visit`).
- **관리자 RPC**: `admin_*`(§9/§10) + 기존 `admin_dashboard, admin_member_*, admin_credit_*, admin_essay_operations` 등. 신규 RPC는 anon·public REVOKE, authenticated GRANT 후 내부 게이트.
- 테이블: `study_sessions, student_target_universities, student_applications, student_application_events, universities, invite_tokens/visits/attributions, profiles`(display_name, academic_status, grade_level, neis_office_code, neis_school_code).
- advisor: 신규 RPC는 `authenticated_security_definer_function_executable`(WARN) 공통 범주만(설계상 의도 — 내부 게이트). 신규 보안 카테고리 0.

## 12. 현재 운영 배포 및 롤백 기준 ✅
- WEB canonical `9788a7ca`(git `0eefc7d`). 선별 오버레이: inScope만 교체, off-scope 0 하드페일, Functions/headers/redirects/routes 보존.
- 롤백: **WEB** → 직전 canonical(`c94a93e7`) 재승격. **RPC** → `supabase/candidates/<name>/rollback.sql`(대개 `drop function`, 기존 객체 무영향). 테이블 추가(invite)는 drop 전 데이터 확인.
- 적용 이력 전체: [strategy wiki](school-study-growth-strategy-20261109.md) §12–§33.

## 13. WEB 구현 완료 기능 ✅/🟡
- `/school` 학교별 공부 순위(참여 지표·전체기간·TOP10·주변순위·마스킹). ✅
- `/invite` 초대 랜딩 + 전역 attribution watcher. ✅(🔴 퍼널 E2E 미검증)
- `/my` 실제 지원 CRUD(이벤트소싱·타임라인) + 희망 대학 입력(직접 insert). 🟡(실사용 E2E 미검증)
- `/admin` 입시 대시보드 3분할 + 합격현황 + 개별 지원 로스터. ✅(🔴 운영자 세션 E2E 미검증)
- 마이페이지 → `/school` 진입 경로(§18). ✅

## 14. Flutter APP 미반영 기능 ⚪ (본 레포 미확인 — APP 레포 교차 필수)
- 아래는 **WEB에만 확인된** 기능. APP 반영 여부는 본 레포에서 알 수 없음:
  - 학교별 공부 순위 UI(`student_school_ranking/card`)
  - 친구 초대 퍼널(invite RPC 9종) — 특히 anon `invite_lookup`/`invite_record_visit`는 APP 딥링크/웹뷰 연동 설계 필요
  - 희망 대학 입력(`student_target_universities` 직접 insert, source='my') — APP은 별도 source 값 권장
  - 실제 지원 입력/합격 입력 UX(`my_application_save`/`my_application_event`) — Codex 작업 D 직접 연관
- **권고**: APP 통합 시 위 RPC/테이블 계약을 재사용(중복 RPC 생성 금지). study_sessions 기록 계약(§1) 일치 유지.

## 15. 실제 사용자 E2E 미검증 항목 🔴
- 운영자(operator) 세션으로만 접근 가능한 admin RPC 전부 — 실제 operator 세션 E2E **NOT TESTED**(읽기전용/권한 차단만 검증).
- 실제 학생의 실제지원·합격 입력 → 현재 운영 데이터 2건은 **운영자 테스트 계정**(실학생 아님).
- 초대 퍼널 전체(방문→가입→학교확인→첫학습→D7).
- 희망 대학 직접 insert RLS를 실제 학생 세션으로 재확인.
- 대시보드 집계 수치의 운영자 제외 처리(미구현 — 후보).

## 16. 내일 Codex 작업과 연결 사항
> 아래 A–F 중 **D만 본 세션 산출물과 직접 연결**(RPC/테이블 준비 완료). B·C·E·F는 **본 세션 범위 외** — 연결점만 제시하며, Codex가 해당 영역 코드/데이터를 직접 교차 확인할 것(본 문서가 검증하지 않음).

- **A. Flutter 학습 기능 통합** → §1 `study_sessions` 스키마 + `active_segments`/`include_in_study_total` 계약 + `my_study_summary()`. APP이 학습 기록 원천. ⚪ APP 레포 작업.
- **B. 최근 5개년 평가원 모의고사·수능 자동채점** → 연결점: `src/lib/essay-runtime/*`(catalog), math evaluate 파이프라인, `functions/api/math/*`·`functions/api/essay/evaluate.ts`. ⚪ **본 세션 미검증** — 기존 task20-* 시험 연결 작업 wiki와 교차 필요.
- **C. 등급컷 3→5개년 확장** → 등급컷 데이터는 본 레포 `data/`에 단순 파일로 없음(=`data/research`만). ⚪ 데이터 소스 위치를 Codex가 먼저 특정(APP/별도)할 것.
- **D. 고3·N수 실제 지원 대학 입력 UX** → ✅ **백엔드 준비 완료**: `my_application_save`/`my_application_event`(이벤트소싱, 멱등 request_key), 중복 전형·학과 허용(§7), 합격 이력 보존(§8). WEB 참조 구현 `src/components/my/applications.tsx`. APP은 이 RPC 계약을 그대로 사용(신규 RPC 생성 불필요).
- **E. 논술 LAB 미완료 연결** → 연결점: `functions/api/essay/*`(evaluate, catalog, connection, availability), `src/lib/essay-runtime/registered-material-catalog.ts`. ⚪ 본 세션 미검증.
- **F. 논술 LAB 대학 ~10개 추가** → 연결점: `universities` 테이블 + essay catalog(`src/lib/essay-runtime/catalog.ts`, registered-material-catalog) + task20-* 대학 연결 패턴(TEST 근거→Catalog→PDF 계약→운영 승인). ⚪ 본 세션 미검증 — task20 연결 절차 wiki 참고.

### Codex 작업 시작 전 주의
1. 운영 변경은 **Owner 승인 게이트** 통과 후에만(후보 SQL→검증→승인→적용→배포→사후검증→wiki). §8 개발순서 준수.
2. 신규 RPC는 반드시 SECURITY DEFINER + `search_path=''` + 게이트 + anon/public REVOKE 패턴.
3. **기존 RPC/테이블 불변** 원칙 — 확장은 신규 객체로.
4. 집계에 운영자/스태프 데이터 혼입 주의(§9).

---
*이 문서는 운영 상태를 바꾸지 않는다. 다음 작업 전 반드시 운영 canonical(`9788a7ca`)과 RPC 목록을 재확인할 것.*
