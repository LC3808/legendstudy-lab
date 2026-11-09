# LegendStudy+ 학교별 학습 경쟁 · 친구 초대 장기 성장 전략 (통합 지시서)
작성일: 2026-11-09 | 상태: Owner 전략 확정 / 단계별 구현 및 운영 반영은 별도 승인

## 0. 핵심 목표
학교 참여 현황 확인 → 학교별 공부시간 경쟁 → 친구 초대 → 신규 가입 → 첫 공부시간 기록 → 학교 순위 상승 → 추가 초대의 Growth Loop 구축. 관리자 통계는 기반일 뿐 최종 산출물이 아니다. 학교별 경쟁과 친구 초대는 핵심 성장 기능(P1)으로 취급한다.

## 1. 현재 확인된 작업 상태 (Claude 보고 기준, 운영 반영 여부는 재확인)
- 관리자 공부시간 분석 학년별 프런트: 커밋 `d9fa201` 보고.
- 학교별 관리자 프런트 및 후보 SQL: 커밋 `9de80ca` 보고. 후보 경로 `supabase/candidates/admin_study_by_school/install.sql`, `test.sql`.
- 운영 RPC 생성/운영 프런트 배포: 이 보고 시점에는 미실행. 이후 상태는 실제 DB/배포 이력 확인.
- 운영 읽기 전용 30일 검증 보고: active 22명, 99,936,369ms; 학교합+미등록=전체; 등록 학교 120개 중 108개 학교에 기간 내 기록자 없음. 수치는 스냅샷이며 화면에 하드코딩 금지.
- 관리자 테스트 7 failed / 202 passed는 기존 기준선과 동일하다는 보고. 원인과 변경 전후 근거를 별도로 기록.

## 2. 공통 집계 계약
- 학교 키: `profiles.neis_office_code` + `profiles.neis_school_code`; 학교명은 NEIS 조회, 누락/실패 상태 처리.
- 유효 계정: 실제 `account_private.allowed(id)` 구현 기준을 검증해 적용.
- `registered_users`: 학교를 등록한 유효 계정 수. 공부 기록이 없어도 포함.
- `active_users`: 선택 기간에 유효 공부시간이 1회 이상 존재하는 고유 사용자 수.
- `ms`: 유효 공부시간 합. `study_sessions.active_segments`를 기존 `admin_dashboard_study`와 동일하게 기간 교집합 및 사용자별 `range_agg`로 중복 제거.
- `avg_ms`: `active_users > 0`일 때 `ms/active_users`; 0명이면 UI에서 '-' 또는 정의된 0 처리.
- 학교 미등록은 별도 그룹. 학교별 합계+미등록=전체(기록자·시간) 정합성 보장.
- 학년: 1/2/3/retaker/unknown; 기간 경계는 KST 표시와 DB UTC 저장을 일치시킨다.
- 학교 변경 시 과거 기록 귀속(현재 학교 vs 당시 학교)은 Owner 정책 결정 전까지 임의 확정 금지.
- 총공부시간 TOP: active 1명 이상; 평균 TOP: active 5명 이상(조정 가능); 참여학생 TOP: registered 1명 이상. 관리자 전체 표는 소규모 학교도 포함.
- 비정상/중복 세그먼트, 취소·삭제 기록, 기간 경계, 장시간 기록, 성능/인덱스, RPC 시간 제한 검증.

## 3. Phase 1 / P0: 관리자 학교별 분석
- 기존 `admin_dashboard_study` 유지. 신규 `admin_study_by_school`은 관리자 전용 별도 RPC.
- 기간/학년 필터, 총시간 TOP, 평균 TOP(최소 기록자 수 설정), 가입학생 TOP, 학교 미등록, 전체 학교 표, NEIS 학교명 표시.
- 후보 SQL은 실제 파일 내용 검토 후 읽기 전용 정합성 테스트. 운영 DB 마이그레이션은 명시적 Owner 승인 필요.
- RPC 적용과 프런트 배포는 별도 승인. 실패 시 '준비 중' 가드.
- 관리자 테스트 기존 실패 7건의 기준선 증거와 신규 회귀 0 확인.

## 4. Phase 2 / P1: 학생용 학교 참여 카드 및 랭킹
- 학교 등록 완료 사용자에게 학교 참여 카드 제공. 예: '레전드스터디+를 이용하는 OO고 학생은 2명이에요. 친구들을 초대해 보세요!' + [친구 초대하기].
- 카드 데이터: 학교명, 가입 학생 수, 이번 주 기록자 수, 총공부시간, 랭킹(유효할 때만).
- 학교 미등록 사용자에게 [학교 등록하기]; 0명·집계 지연·NEIS 실패·표본 부족 상태 정의.
- 학생용 랭킹: 기간(이번 주/지난주/이번 달), 총시간/평균/가입학생, TOP10, 우리 학교 주변 순위, 검색/더보기. 현재 학교 강조.
- 학생용은 관리자 RPC 직접 호출 금지. 별도 권한 제한 조회 API/RPC 및 소표본 공개 기준 설계. 개인 학습 기록 공개 금지.
- WEB과 Flutter APP 동일 Backend, Flutter Native UI 유지(WebView 대체 금지). 기존 학습 기능/라우팅 보존.
- 학교명/가입자/공부시간/순위는 실데이터만; 예시 숫자 하드코딩 금지.

## 5. Phase 3 / P1: 친구 초대·가입 전환
- 카드/랭킹에서 [친구 초대하기] → OS 공유 시트(카카오톡·문자 등).
- 공유 문구: '우리 학교 공부시간 랭킹에 참여해 봐! 레전드스터디+에서 함께 공부시간을 기록하고 학교 순위를 높여보자!' + 학교명 + 공식 랜딩/앱 설치 경로.
- 불투명 초대 토큰 사용. 외부 URL에 내부 사용자 식별자 직접 노출 금지. 초대 링크의 학교는 제안만 하고 가입자가 확인.
- 앱 설치/미설치/기존 사용자/로그아웃/재설치/웹↔앱 경로 설계. Deferred deep link는 실제 지원 여부 확인.
- GA4 및 기존 이벤트 계약과 정합: `school_card_view`, `school_ranking_view`, `school_invite_click`, `school_invite_share`, `school_invite_link_open`, `school_invite_signup`, `school_invite_first_study`. 중복 제거 및 어트리뷰션 기간 명시.
- 초기 보상/추천인 포인트 없음. 공유→가입→첫 학습→7일 유지 전환을 먼저 검증.

## 6. Phase 4 / P2 및 이후 P3
- P2: 참여 10/50명 달성, 주간 TOP10, 연속 활동 배지, 학교별 목표, 순위 변동 알림, 개인 vs 학교/학년 평균 비교.
- P3: 내신/모의고사 성적 데이터 연동 이후 성적대별 평균 공부시간 및 성적 변화와의 상관 분석. 인과관계 주장 금지.
- 표본 부족 시 평균·순위·개인 비교를 제한. 순위 상승 예상 메시지는 계산 가능한 경우에만.

## 7. Growth KPI 및 운영 관측
- 핵심 지표: 초대 유입 신규 사용자 중 실제 첫 공부시간을 기록한 학생 수/주.
- 보조: 학교별 가입자, 7일 활성 기록자, 기록 참여율(active/registered), 공유 버튼 클릭, 링크 방문, 초대 가입 전환, 초대→첫 학습 전환, 초대 가입자 D7 유지, 학교별 활성 학교 수.
- 관리자 Growth 분석은 이벤트 스키마/GA4 실제 연결 여부 확인 후 구현. 미연결은 NOT TESTED로 보고.

## 8. 개발 순서 / 승인 게이트
1) 기존 wiki·코드·실제 DB/RPC·배포 상태 확인. 중복 구현 금지.
2) Phase 1 후보 SQL 정합성/보안/성능 검증 및 관리자 프런트 테스트.
3) Owner의 별도 운영 DB 승인 후 RPC 적용, 권한·집계 검증.
4) Owner의 별도 배포 승인 후 관리자 프런트 배포.
5) Phase 2 학생용 API·WEB·APP 상세 설계 및 승인 후 구현.
6) Phase 3 초대 링크·이벤트 설계 및 승인 후 구현.
7) 운영 데이터로 실험/전환 검증, Phase 4 범위 결정.
각 단계 보고: 변경 파일·커밋, 테스트 PASS/FAIL/NOT TESTED, 실데이터 검증, 운영 영향, 롤백, 다음 승인 필요 사항. Codex 가용 여부와 무관하게 Claude Code 단독 진행 가능.

## 9. 절대 보존
기존 운영 API/RPC/DB/Worker/Functions/인증·권한/라우팅 및 WEB·APP 데이터 일관성. 범위 밖 변경 금지. DB 변경·운영 배포·권한 변경은 각각 Owner 명시 승인 필요.

## 10. Claude Code 실행 지시
이 문서를 상위 Growth 요구사항으로 삼는다. 현재 관리자 학교별 통계만으로 완료 처리하지 않는다. 우선 실제 브랜치/커밋과 운영 반영 여부를 검증하고 Phase 1 잔여 작업 및 Phase 2·3의 DB/API·WEB/APP·이벤트별 구체적 구현 계획을 제출한다. 계획만으로 Phase 2·3 운영 변경을 실행하지 않는다.

## 11. 실행 상태 · 승인 이력 (2026-11-09 업데이트)

### Phase별 구현 상태
- **Phase 1 (P0) 관리자 학교별 분석**: 프런트 구현 완료(`d9fa201` 학년별, `9de80ca` 학교별+후보 SQL). **운영 RPC `admin_study_by_school` 적용 완료**(마이그레이션 `admin_study_by_school_v1`). **관리자 프런트 운영 배포는 미실행(별도 승인 대기)**.
- **Phase 2 (P1) 학생용 카드·랭킹**: 설계 확정, 구현 미착수(운영 변경 없는 프런트부터 착수 승인됨).
- **Phase 3 (P1) 친구 초대·전환**: 통합 설계 확정, 미착수.
- **Phase 4 (P2/P3)**: 배지·목표·성적대별 — 후순위.

### 운영 반영 상태
- 라이브 Pages canonical: `e363d279`(상단 KPI까지). d9fa201/9de80ca(공부시간·학교별 프런트)는 **미배포**.
- 운영 DB: `admin_study_by_school` 함수 **신설 적용됨**. 기존 테이블·RPC·데이터·인증 **무변경**.

### 신규 RPC — admin_study_by_school(p_from,p_to,p_grade,p_min_users)
- SECURITY DEFINER, search_path='', statement_timeout 8s, `admin_operator()`+`account_private.allowed()` 게이트, anon/public EXECUTE 회수, authenticated 부여.
- 반환: `registered_users`(유효 가입자)·`active_users`(기간 기록자)·`ms`·`avg_ms` 학교별 + `unregistered` + `total`. 집계 기준은 `admin_dashboard_study`와 동일(active_segments range_agg 중복제거).
- 후보/검증 SQL: `supabase/candidates/admin_study_by_school/{install.sql,test.sql}`.

### 학생용 API 설계(요약, 미구현)
- `student_school_card`, `student_school_ranking` — 관리자 RPC와 분리, 학교 단위 집계만, 소표본 공개 가드, 개인 기록 비공개. 집계 로직은 Phase 1과 공유.

### WEB/APP 범위
- WEB(React) 우선 → APP(Flutter Native UI, 동일 Backend, WebView 금지). 기존 학습 기능·라우팅 보존.

### 초대 기능·이벤트 설계(요약, 미구현)
- 불투명 초대 토큰(URL에 내부 식별자 노출 금지), 학교는 가입자 최종 확인.
- GA4: school_card_view/ranking_view/invite_click/share/link_open/signup/first_study. 중복 제거·어트리뷰션 기간 명시.

### 테스트 결과(Phase 1 RPC 적용)
- 함수 존재 ✅ · SECURITY DEFINER ✅ · grants(anon/public 회수, authenticated/postgres/service_role) ✅
- **비operator 호출 차단**: MCP(비operator) 호출 → `42501 insufficient_privilege` ✅ (일반/비로그인 차단)
- **집계 정합성**(읽기 전용 30일): 학교합+미등록=전체 — users 22=22, ms 99,936,369=99,936,369 ✅ (대시보드 일치)
- 신규 보안 권고 없음(기존 admin_dashboard_study와 동일 패턴). 관리자 테스트 7 failed/202 passed = 기존 기준선, 신규 회귀 0.
- operator 호출 성공 수치는 프런트 배포(별도 승인) 또는 Owner 로그인으로 최종 확인.

### 다음 개발 단계
1. 관리자 학교별 프런트 **운영 배포 승인** → 배포 → operator 화면 검증.
2. Phase 2 학생용 WEB(카드·랭킹) 구현(운영 변경 없음) + 학생 API 설계 상세화(승인 후 RPC 신설).
3. Phase 3 초대 토큰·이벤트(승인 후 테이블/이벤트 신설).

### Owner 승인 이력
- 2026-11-09: admin_study_by_school RPC 신설·권한·검증 **승인·적용**. 관리자 프런트 배포는 미승인(별도). Phase 2 프런트 개발 착수 승인(운영 변경 없음). Phase 2/3 운영 RPC·테이블·권한·배포는 각각 별도 승인.

## 12. Phase 1 관리자 프런트 운영 배포 (2026-11-09)

- **배포 ID `52883c4a`** / 소스 `f1d7100`. 직전 canonical(롤백 대상) `e363d279`.
- 배포 전 범위 확인: 라이브(11b8b53) 대비 SRC 변경은 **`admin-data-page.tsx` 1파일(공부시간 분석 페이지)뿐**, functions/public 0변경, 범위 밖 변경 없음. (학생 랭킹·친구 초대·인증/권한·RPC/DB 스키마 변경 **미포함**.)
- 검증: TS·ESLint·빌드 ✅, 관리자 테스트 7 failed/202 passed(기준선 동일·신규 0), 선별 dry-run off-scope 0·Functions 보존.
- 배포 후(익명/빌드 레벨): canonical 승격 ✅, `/admin/`·`/admin/data/study/`·`/admin/members/`·비관리자 200 ✅, 운영 빌드에 `admin_study_by_school` 호출 코드 포함 ✅.
- **NOT TESTED (operator 로그인 필요)**: 관리자 RPC 호출 성공 수치, 실제 학교별 가입자/활성 기록자/총시간/평균/TOP 표시, NEIS 학교명, 미등록 그룹, 기간·학년 필터 동작. → Owner operator 계정 확인 필요.
- 다음 승인 필요: Phase 2 학생용 RPC/프런트(운영 변경 수반 시), Phase 3 초대 토큰·이벤트·APP.

## 13. Phase 2 학생용 WEB 구현 (2026-11-09, 운영 변경 없음)

학생용 학교별 학습 경쟁 기능 WEB 1차 구현. **운영 DB 변경·운영 배포·인증/권한 변경·기존 관리자 기능 수정 없음.** 학생 화면은 관리자 RPC를 직접 호출하지 않으며, 전용 학생 RPC(초안, 미적용)를 통해서만 데이터를 읽는다. 데이터 부재 시 가짜 수치 대신 "준비 중"·빈 상태를 표시한다.

### 구현한 화면/컴포넌트
- `/school` 라우트(`src/app/school/page.tsx`) — 로그인 가드(`OwnerArea`, 비로그인 시 로그인 유도).
- **우리 학교 참여 현황 카드**(`SchoolParticipationCard`) — 가입 학생 수 / 최근 7일 기록자 / 이번 주 총공부시간 / 우리 학교 순위. 임계값 메시지: 1~4명 친구 초대 중심 · 5~19명 참여 확대 · 20명+ 순위 경쟁.
- **학교별 TOP 랭킹**(`SchoolRankingPanel`) — 지표 탭(총공부시간/1인당 평균/가입 학생 수) · 기간(이번 주/지난 주/최근 30일) · TOP10 + 우리 학교 하이라이트 + 주변 순위. 평균 지표 최소 표본 5.
- **친구 초대 UX**(`SchoolInviteButton`) — `navigator.share` + 클립보드 폴백. 초대 토큰/트래킹 주입 지점(`buildUrl`/`onShared`) 모듈화. **가짜 초대 통계 없음.**
- `SchoolName` — 공개 NEIS 프록시(`resolveSchoolName`) 재사용(공개 학교 식별자만), 조회 중/확인 불가 상태 표기.

### 변경 파일
- 신규: `src/lib/school/participation.ts`(+`.test.ts`), `src/components/school/{invite-button,school-name,school-view}.tsx`, `src/app/school/page.tsx`, `supabase/candidates/student_school/{install,test}.sql`.
- 수정(추가 전용): `src/app/globals.css`(school 섹션 스타일). **관리자 소스·RPC·인증 무변경.**

### 신규 데이터 타입(계약)
- `SchoolCard`(has_school 분기), `SchoolRankRow`, `SchoolRanking`, `SchoolRankMetric`('total'|'average'|'registered'), `SchoolRankPeriod`('week'|'last_week'|'month'). 버전 가드(`student-school-card-v1`/`student-school-ranking-v1`) + 엄격 파서, RPC 부재/오류 시 `null` 반환(가드).

### 학생용 RPC 설계(초안 — 미적용)
- `student_school_card()` — `auth.uid()`의 프로필 학교 기준(임의 학교코드 전달 불가). 반환: registered_users, active_users_7d, week_ms(KST 주), rank(주간 총시간, 표본 없으면 null).
- `student_school_ranking(p_period,p_metric,p_min_users=5)` — 학교 단위 집계만. top10/my_school/around/school_count. 평균 지표 min 표본 가드.
- 공통: SECURITY DEFINER, search_path='', 8s timeout, `account_private.allowed(auth.uid())` 게이트(**admin_operator 아님**), anon/public EXECUTE 회수·authenticated 부여. 집계 기준은 `admin_study_by_school`와 동일(active_segments range_agg 중복제거) → 수치 정합.
- 후보 SQL: `supabase/candidates/student_school/install.sql`, 읽기전용 검증: `.../test.sql`.

### 테스트 결과
- 신규 파서 테스트 6/6 통과. TS(`tsc --noEmit`) 0 오류, ESLint 0 오류(신규 파일).
- 전체 스위트: 8 failed / 1899 passed — **8건은 Phase 2 제외 상태에서도 동일하게 실패**하는 기존 admin/materials 기준선(materials.test, admin-console/analytics/dashboard-focus). Phase 2 신규 회귀 0.

### 실제 데이터 연동에 필요한 작업(Owner 승인 필요)
1. `student_school_card`/`student_school_ranking` 운영 적용 전 격리 검증: `test.sql` 정합성, 운영 규모 statement time, `get_advisors` 신규 권고 0.
2. **운영 `apply_migration` 승인**(학생 RPC 신설). 적용 전까지 `/school`은 "준비 중"·빈 상태.
3. 학생용 WEB 운영 배포(선별 overlay) 승인.
4. Flutter APP 네이티브 구현(동일 Backend, WebView 금지)은 WEB 승인·검증 후.

### Phase 3 연계(미착수)
- 초대 토큰(불투명)·GA4 이벤트·어트리뷰션 — 승인 후 테이블/이벤트 신설. 초대 버튼은 주입 지점만 마련.

## 14. Phase 2 학생용 RPC 격리 검증 (2026-11-09, 읽기 전용 · 운영 변경 없음)

후보 `student_school_card()` / `student_school_ranking()`를 운영 DB(`stlhijzpjfgwwdgunlsd`)에서 **읽기 전용**으로 검증. RPC 생성·권한·배포 없음. 검증 중 발견한 공개 소표본 노출 결함을 후보 SQL·계약·UI에 반영(미적용).

### 14.1 집계 정합성 (관리자 기준과 동일)
- 30일 창: 전체 기록자 22 = 재검 22, 총시간 99,936,369ms = 재검 99,936,369ms → **관리자 검증 수치와 완전 일치**. 학교합+미등록=전체 ✅ (중복 제거/range_agg 동일).
- KST 주간 경계: `date_trunc('week', now() AT TIME ZONE 'Asia/Seoul')` = 2026-11-08 15:00Z = **2026-11-09 00:00 KST(월)** ✅.
- 이번 주 창: 총시간 재검 일치, 미등록 0 ✅.
- 학교 미등록(office/school null) 사용자는 집계에서 분리(미등록 294명·주간 활동 0) ✅.
- 평균 지표(active≥5) 현재 자격 학교 0 → **빈 결과(가짜 없음)** 정상.

### 14.2 접근 권한 · 보안
- MCP 역할 = `postgres`, `auth.uid()` null, `admin_operator()` = false.
- 관리자 RPC는 postgres 역할로도 **차단(42501)** → 게이트 견고. 학생 RPC도 `auth.uid() is null → insufficient_privilege`로 비로그인/무JWT 차단(동일 경로).
- 카드 학교 범위는 `auth.uid()` 프로필 기준 → **임의 학교코드 조회 불가**.
- 반환은 학교 단위 집계만(office/school 공개식별자 + 집계 수치), 개인 식별/행 데이터 없음.
- `SECURITY DEFINER` + `search_path=''` + `statement_timeout 8s` + anon/public EXECUTE 회수 설계 확인(후보, 미적용).

### 14.3 소표본 공개 정책 — **결함 발견 및 수정**
- **발견**: 현재 활동 학교 12곳이 **전부 기록자 1명**(2~4명 0곳, 5명+ 0곳). 후보 원안(`total` active≥1)은 학교 총시간 = 개인 공부시간을 그대로 공개(최상위 77,903,899ms ≈ 21.6h = 1인). API payload는 지표와 무관하게 모든 학교 ms를 반환 → `registered` 탭에서도 1인 학교 ms 유출.
- **정책 구분(관리자≠학생 공개)**: 관리자 통계는 소규모 누락 금지(전수). 학생 **공개** 통계는 k-익명성 적용.
- **수정(후보 SQL)**: `p_min_recorders`(기본 3, 하한 2) 도입.
  - `total` 순위: 기록자 ≥ p_min_recorders 학교만 공개.
  - 어떤 지표에서든 기록자 < p_min_recorders 학교의 `ms`/`avg_ms`는 **null로 마스킹**(`pub_ms`/`pub_avg`). 집계용 원본은 내부 유지.
  - 카드 전국 `rank`도 기록자 ≥ p_min_recorders 모집단에서만 부여(미달 시 null="집계 준비 중").
  - `average`는 기존 active≥5 유지, `registered`는 Owner 승인대로 registered≥1 유지(수치=가입 수만).
- **검증(수정 후, 읽기전용)**: total 자격 0·avg 자격 0(빈 결과), registered 120곳(수만), 활동 1인 학교 12곳 ms 전부 null, 1~2인 학교 ms 전부 숨김(`all_small_hidden=true`) → **개인 시간 미유출 확인**.
- **Owner 결정 필요**: 공개 총시간 기준 기록자 하한 값(제안 3, 평균과 일치시키려면 5). `registered` 하한(현 1, 선택적 2) 유지/변경.
- **잔여 고려**: 카드의 `week_ms`는 본인 학교 집계라 항상 표시(본인 소속). 학교에 기록자가 "본인 아닌 1명"뿐일 때 그 1명의 시간이 소속원에게 보일 여지 → 낮은 위험(학교 총시간 기능 취지), 필요 시 카드에도 동일 하한 적용 옵션.

### 14.4 성능 (읽기 전용 EXPLAIN ANALYZE, 30일 랭킹)
- 실행 8.8ms / 계획 2.7ms(현 규모). 지배 비용 = `profiles` **Seq Scan + `account_private.allowed(id)` 필터**(2,614/2,627 buffers). `study_sessions`는 소형 seq scan, range_agg/정렬 미미.
- 확장 리스크: (1) `allowed()` per-row 비용(프로필 증가 시 선형) — 후보는 `eligible as materialized`로 1회 평가(관리자와 공유), (2) 전역 시간범위 `study_sessions` 스캔(ended_at/started_at 단독 인덱스 없음, 관리자와 동일). 둘 다 **기존 관리자 RPC와 동일 특성**.
- 권고: 학생 공개 엔드포인트는 호출 빈도가 높을 수 있으므로 **사전 집계/캐싱**(주기 갱신 MV 또는 학교 주간 합계 캐시 테이블) 트래픽 증가 전 도입 검토. 현 지연은 출시 규모에서 충분.

### 14.5 프런트 계약 검증
- `SchoolParticipationCard`↔`student_school_card`: 필드 일치, rank null→"집계 준비 중", 임계값(1~4/5~19/20+) 정상.
- `SchoolRankingPanel`↔`student_school_ranking`: 기간/지표/정렬/우리학교 하이라이트/주변, ms null→"비공개", 빈/미존재/오류/미등록/소표본 상태 모두 가짜값 없음. 클라이언트는 period/metric/min_users 전달, `p_min_recorders` 서버 기본 3.
- `SchoolInviteButton`/`SchoolName`: RPC 비의존(공유·공개 프록시).
- 신규 파서 테스트 7/7, TS 0, ESLint 0.

### 14.6 운영 적용 시 예상 영향 / Owner 승인 필요
1. 신규 함수 2개 생성(기존 테이블·데이터·RPC·권한 **무변경**), authenticated EXECUTE 부여·anon/public 회수. 읽기 전용 집계(쓰기 없음).
2. 적용 전: `test.sql` 정합성 재확인, 운영 규모 statement time, `get_advisors` 신규 권고 0 확인.
3. **승인 필요**: (a) 학생 RPC 운영 `apply_migration`, (b) 공개 소표본 하한값 확정(3 vs 5), (c) 학생 WEB 운영 배포(선별), (d) 캐싱/사전집계 도입 여부, (e) Flutter APP 착수(WEB 검증 후).
- 운영 DB 변경·배포는 수행하지 않음. 검증은 전부 읽기 전용(EXPLAIN 포함).

## 15. Owner 공개 정책 확정 + 소규모 Growth UX (2026-11-09, 운영 변경 없음)

Owner가 학생용 공개 기준을 확정. 후보 SQL·데이터 계약·WEB UI에 반영(운영 미적용). 관리자 통계는 기존 전수 정책 유지, 아래는 **학생용 공개 통계에만** 적용.

### 15.1 확정된 공개 기준
| 지표 | 공개 기준 | 구현 |
|---|---|---|
| 가입 학생 수 / 가입 수 랭킹 | 1명 이상 | registered≥1 |
| 총공부시간 / 총시간 랭킹 | 기록자 3명 이상 | `p_min_recorders=3` |
| 평균 공부시간 / 평균 랭킹 | 기록자 5명 이상 | `p_min_users=5` |

### 15.2 데이터 공개 정책 (API 반환 단계 마스킹 — 프런트 전용 숨김 아님)
- 기록자 < 3: 총공부시간(`ms`)을 API에서 `null`. 총시간 랭킹 제외.
- 기록자 < 5: 평균(`avg_ms`)을 API에서 `null`. 평균 랭킹 제외.
- 가입 학생 수는 1명부터 반환.
- 랭킹 정렬 키는 공개 지표(총시간은 3+ 집단 내 ms, 평균은 5+ 집단 내 avg, 가입은 registered)만 사용 → 비공개 시간 간접 노출 없음.

### 15.3 소규모 학교 Growth UX (숨기지 않음)
- 가입 1~2명 학교도 참여 카드·친구 초대 **정상 표시**.
- 기록자 3명 미만: 총시간/순위 미공개 대신 안내 — "🔓 우리 학교 공부시간 랭킹이 곧 열려요!" + "친구들과 함께 공부시간을 기록하면 우리 학교의 공부시간 랭킹이 공개됩니다." + `recorders_needed>0`이면 "N명이 더 공부시간을 기록하면 우리 학교 랭킹이 공개됩니다." + [친구 초대하기].
- 카드 RPC에 `min_recorders`·`week_recorders`·`recorders_needed` 추가, `week_ms`/`rank`은 기록자 3+에서만 값(미만 null).

### 15.4 밴드 검증 (읽기 전용, 합성 데이터 — 테이블 무변경)
| 학교 | 가입 공개 | 총시간 랭킹 | 평균 랭킹 | API 총시간 | API 평균 | 카드 필요인원 | 카드 랭킹 |
|---|---|---|---|---|---|---|---|
| 가입1·기록0 | ✓ | ✗ | ✗ | null | null | 3 | 잠금 |
| 가입2·기록0 | ✓ | ✗ | ✗ | null | null | 3 | 잠금 |
| 가입2·기록1 | ✓ | ✗ | ✗ | null | null | 2 | 잠금 |
| 가입3·기록2 | ✓ | ✗ | ✗ | null | null | 1 | 잠금 |
| 가입4·기록3 | ✓ | ✓ | ✗ | 공개 | **null** | 0 | 공개 |
| 가입6·기록4 | ✓ | ✓ | ✗ | 공개 | **null** | 0 | 공개 |
| 가입9·기록5 | ✓ | ✓ | ✓ | 공개 | 공개 | 0 | 공개 |
- 핵심 교정: 평균은 기록자 3이 아니라 **5 미만에서 API null**(Owner 명시) — `pub_avg`를 `p_min_users` 기준으로 수정 후 재검(기록3·4 평균 null 확인).

### 15.5 테스트/정합
- 신규 파서 테스트 8/8(잠금 카드·마스킹 포함), TS 0, ESLint 0. 기존 Phase 2 구현/테스트 보존.
- 운영 데이터 정합(14절) 불변: 30일 22명/99,936,369ms 관리자 일치.

### 15.6 운영 적용 (별도 Owner 승인 필요)
- 후보 SQL `supabase/candidates/student_school/{install,test}.sql` 최종본. 적용 전 `test.sql` 정합성·statement time·`get_advisors` 신규 권고 0 재확인.
- 승인 대기: (a) 학생 RPC `apply_migration`, (b) 학생 WEB 선별 배포. 이후 Flutter APP.
- 본 단계까지 운영 DB 변경·배포 없음(검증 전부 읽기 전용). Codex 없이 Claude Code 단독 수행.

## 16. 학생용 RPC 운영 적용 (2026-11-09, Owner 승인)

Owner 승인으로 학생용 RPC 2종을 운영 DB(`stlhijzpjfgwwdgunlsd`)에 적용. **기존 테이블·관리자 RPC·인증 정책 무변경, 학생 WEB 배포·APP·초대 토큰 테이블은 승인 제외(미실행).**

### 16.1 적용된 migration
- `20261109123602_student_school_v1` — `student_school_card()`, `student_school_ranking(p_period,p_metric)` 신설(쓰기 없음, 읽기 전용 집계).

### 16.2 공개 기준 서버 강제 (우회 불가)
- 기준을 **서버 상수로 고정**: `v_min_recorders=3`(총시간), `v_min_users=5`(평균). 클라이언트가 낮출 수 있는 `p_min_users`/`p_min_recorders` **입력 파라미터 제거**.
- 검증: `student_school_ranking('week','total',1,1)` 호출 → **42883 (함수 없음)** → 파라미터로 기준 우회 불가 확인.
- 총시간<3·평균<5 학교의 `ms`/`avg_ms`는 **API 반환 단계에서 null**(모든 metric 공통 `pub_ms`/`pub_avg` 마스킹). 정렬 키는 공개 지표만 사용 → 간접 노출 없음. 비공개 학교는 total 랭킹 자체에서 제외, 카드 rank null.

### 16.3 함수 정의·권한 (적용 후 확인)
- 둘 다 `SECURITY DEFINER`, `volatile=stable`, `search_path=''`, `statement_timeout=8s`.
- ACL: `authenticated=X`, `service_role=X`, `postgres=X` — **anon/public EXECUTE 없음(회수됨)** ✅.
- `student_school_card()` 인자 없음, `student_school_ranking(p_period text, p_metric text)` 2개 — 최소 기준 파라미터 미노출 ✅.

### 16.4 보안·접근 검증 (적용 후)
- 비로그인/무JWT(`auth.uid()` null) 호출: card·ranking **모두 42501 차단** ✅.
- 유효하지 않은 계정(`account_private.allowed=false`): 동일 게이트 경로로 42501 (로그인 계정별 실호출은 NOT TESTED).
- 신규 보안 권고: 적용 전후 동일(5건, 카테고리·건수 불변). 학생 RPC는 기존 `authenticated_security_definer_function_executable` WARN에 포함 — 관리자 RPC와 동일 설계 패턴(함수 내부 auth 게이트), **신규 권고 유형 없음** ✅.

### 16.5 실제 데이터 정합성 (적용 후, 읽기 전용)
- 30일: schools+미등록=전체 `ms_consistent=true`, 22명 / 99,972,863ms(관리자와 동일 기준, 창 경과로 §14 대비 소폭 증가) ✅.
- 현재 기록자 3명 이상 학교 0곳 → 공개 총시간 랭킹 빈 상태(정책대로, 개인 노출 0). 평균 랭킹도 빈 상태(기록자 5+ 0곳).

### 16.6 NOT TESTED (실제 로그인 세션 필요)
- 일반 로그인 사용자 성공 호출 반환값(카드 수치·랭킹 행), 학교 미등록 사용자 `has_school:false` 실호출, 특정 유효하지 않은 계정 실차단, 기간(week/last_week/month)·metric별 실제 반환.
- 집계 로직 자체는 §14·§15 읽기 전용 인라인 등가 검증 완료(관리자 일치, KST 경계, 밴드 매트릭스). 실사용자 경로만 미검.

### 16.7 신규 회귀
- 앱 테스트(학교 파서 8/8), TS 0, ESLint 0. 기존 admin/materials 8 failed는 Phase 2 이전부터의 기준선(신규 0). RPC 적용은 기존 객체 무변경.

### 16.8 다음 승인 필요 사항
1. **학생용 WEB 운영 배포(선별 overlay)** — 별도 Owner 승인(이번 승인 제외). 배포 전까지 운영 WEB에는 `/school` 미노출.
2. 로그인 세션 기반 적용 후 최종 검증(관리자 operator 또는 학생 계정).
3. Flutter APP 네이티브, 친구 초대 토큰 테이블/이벤트(Phase 3) — 각각 별도 승인.

## 17. 학생용 /school WEB 운영 배포 (2026-11-09, Owner 승인)

Owner 승인으로 `/school` 학생용 WEB를 **선별 오버레이**로 운영 배포. 운영 적용된 학생 RPC 2종 사용. 기존 운영/관리자/Functions 보존.

### 17.1 배포 결과
- **운영 배포 ID `dfa50be9`** (dfa50be9-07a8-45fc-8522-02552f767370) / 소스 커밋 `23bad0e`.
- **롤백 대상 `52883c4a`** (직전 canonical = Phase 1 admin deploy). CF Pages 롤백으로 즉시 복귀 가능.
- 1차 시도 `1c3dd849`는 워커 번들 포맷 오류로 deploy 스테이지 실패(운영 무영향, canonical 미승격) → 워커 재생성 후 재배포 성공.

### 17.2 선별 범위 (dry-run = apply 동일)
- 변경 파일 **16건**: `/school/*` 5(index.html/txt, __next._full/_tree/__PAGE__) + 신규 content-hash `/_next/static` 11. **범위 밖 변경 0건**(오버레이 가드 통과).
- 자산 2423 → 2439. Functions 라우트 24개 보존. `_headers`/`_redirects`/`_routes.json` 베이스라인 재사용.

### 17.3 Worker/Functions 처리 (중요)
- 배포는 새 Pages deployment를 생성하므로 워커를 포함해야 함. 운영 canonical의 **정확한 워커 번들은 CF API로 다운로드 불가**하고 로컬 백업(.local)도 정리됨.
- `functions/`·`cloudflare/` 소스는 f1d7100(=52883c4a 소스) 이후 **무변경**(최근 변경 918661c가 f1d7100에 포함, 학생 커밋은 미접촉). 따라서 `wrangler pages functions build functions --outdir`로 **동일 소스에서 워커 재컴파일** → 동작 보존(바이트 동일 아님, 소스 동일).
- 재컴파일 워커 24라우트(kakao/essay/math/payments/owner-review/ga4/middleware) 정상. 배포 후 `/api/essay/*` **401(인증 요구, 404/500 아님)** → 워커 라우팅 정상 동작 확인.

### 17.4 배포 전 검증 (전 항목 통과)
운영소스(f1d7100)↔브랜치(23bad0e)=학생 기능만 추가 · 선별 변경 16 · 범위 밖 0 · 관리자 보존 · Worker/Functions 보존(소스 동일 재컴파일) · TS 0 · ESLint 0 · 프로덕션 빌드 성공 · 테스트 기준선 유지(학교 8/8, 기존 8 failed 불변) · 롤백 52883c4a 확보.

### 17.5 배포 후 검증 (익명/빌드 레벨)
- canonical `dfa50be9` 승격 ✅. `lab.legendstudy.com/school/` 200 ✅. `/`·`/admin/`·`/pricing/` 200(기존 보존) ✅.
- `/school` HTML 제목 "우리 학교 공부 경쟁" 노출, 로그인 가드는 클라이언트 렌더.
- 운영 빌드 JS 청크에 `student_school_ranking` 호출 코드 포함 ✅.
- Functions 익명 호출 401(동작) ✅.

### 17.6 실제 로그인 학생 계정 검증 — NOT TESTED
실제 로그인 세션 없음. 다음 전부 NOT TESTED: 학생 RPC 호출 성공, 본인 학교 자동 인식, 학교명 표시, 가입 학생 수, 최근 7일 기록자, 소규모 잠금 메시지(N명 더), 친구 초대/공유 링크, 학교별 랭킹, 학교 미등록 처리. → Owner 또는 실학생 계정 확인 필요.

### 17.7 회귀·롤백
- 신규 회귀 0(기존 admin/materials 8 failed = Phase 2 이전 기준선). RPC·기존 페이지·Functions 무변경.
- 롤백: canonical을 `52883c4a`로 복귀(즉시). 필요 시 CF Pages rollback.

### 17.8 Phase 3 연계 (미구현 유지)
이번 배포는 친구 초대 UX(공유 버튼)까지. 초대 토큰/가입 전환·학교 확인·첫 공부시간·7일 유지율 추적은 **미구현**. 초기 추천인 보상 미도입. Phase 3 별도 개발·승인.

## 18. 마이페이지 → /school 진입 경로 추가 (2026-11-10, 프런트 전용 · 배포 승인 대기)

학생용 `/school`은 운영 배포됐으나 마이페이지 진입 경로가 없어, 공부시간 영역에 진입 메뉴를 추가. **운영 DB·RPC·인증·권한 변경 없음. 프런트엔드만.** 배포는 Owner 승인 후.

### 18.1 구현
- 신규 컴포넌트 `src/components/my/school-entry.tsx`(`SchoolStudyEntry`) — 표현 전용(데이터 접근 없음), 재사용 가능(향후 타이머/통계 보조 진입용 `compact` 옵션).
  - 메뉴명 "우리 학교 공부시간" · 설명 "우리 학교 친구들과 공부시간을 비교하고 학교별 랭킹에 참여해 보세요." · 버튼 "[우리 학교 랭킹 보기 →]" → `/school/`.
- `src/components/my/dashboard.tsx` — "나의 학습 시간" 섹션 바로 다음에 배치(계정 섹션 앞). 기존 디자인 시스템(`my-section`/`my-links`/`button--primary`) 유지, 레이아웃 미변경.
- `globals.css` — `.my-school-entry__desc` 여백 1줄 추가(추가 전용).

### 18.2 UI/UX 원칙 준수
기존 마이페이지 디자인/레이아웃 보존, 모바일은 `my-section`+`my-links`(flex-wrap) 기존 반응형 패턴 사용. 학교 미등록 안내는 `/school` 페이지가 처리(카드에서 중복 안내 안 함). 로그인 가드는 `OwnerArea`(마이페이지) + `/school`의 `OwnerArea` 이중, 변경 없음.

### 18.3 검증
- 단위 테스트: `school-entry.test.tsx`(메뉴/설명/`/school` 링크) + `dashboard.test.tsx`(섹션 순서에 "우리 학교 공부시간" 포함) — **20/20 통과**.
- TS 0 · ESLint 0 · 프로덕션 빌드 통과. 신규 회귀 0(기존 마이페이지 기능 보존).
- NOT TESTED(실로그인 세션 필요): 실제 마이페이지에서의 표시·탭 이동 시각 확인.

### 18.4 보조 진입 경로(검토 — 이번 미구현)
학습 타이머/공부시간 통계 화면의 보조 진입은 `SchoolStudyEntry compact`로 재사용 가능하도록 설계만 해 둠. 이번 작업은 마이페이지 우선, 보조 진입은 차기.

### 18.5 배포
프런트 전용 변경. 운영 배포는 §17과 동일한 선별 오버레이(이번엔 `/account`+공유 static 범위)로 진행하되 **Owner 승인 후**. 미승인 상태 — 미배포.

### 18.6 마이페이지 진입 경로 운영 배포 (2026-11-10, Owner 승인)
- **운영 배포 ID `aaa350d6`** / 소스 `0e8f8f5`. **롤백 대상 `dfa50be9`**(직전 canonical = /school 배포).
- 선별 오버레이(inScope `/account/`): `/account/*` 20페이지 재오버레이(공유 CSS 변경으로 하위 페이지 HTML 포함) + 신규 static 5. **범위 밖 변경 0건**. 범위 밖 페이지는 기존 CSS 유지(신규 규칙 미사용이라 무영향). Functions 24 보존(소스 동일 재컴파일).
- 배포 후(익명/빌드): canonical `aaa350d6` 승격 ✅. `/account/`·`/account/settings/`·`/school/`·`/`·`/pricing/`·`/admin/` 200 ✅. `/api/essay/*` 401(동작) ✅.
- NOT TESTED(실로그인): 마이페이지에서 "우리 학교 공부시간" 메뉴 시각 표시·탭 이동(클라이언트 렌더·auth 게이트). 진입 코드 운영 번들 포함 확인됨.
- 신규 회귀 0. 롤백: canonical `dfa50be9` 복귀.
