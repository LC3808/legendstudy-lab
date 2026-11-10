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

## 19. 학교별 공부 순위 개선 — UI/UX + 공개 정책 통일 (2026-11-10, 구현 완료 · 운영 적용/배포 대기)

운영 중인 `/school`을 개선. **운영 RPC·DB·인증·배포 변경 없음(후보/프런트만).** 운영 적용·배포는 Owner 별도 승인.

### 19.1 UI/UX (PART A)
- 페이지 제목 "우리 학교 공부 경쟁" → **"우리 학교 공부 순위"**. 하단 섹션 "학교별 TOP 랭킹" → **"학교별 공부 순위"**. 마이페이지 메뉴 "우리 학교 공부시간" → **"우리 학교 공부 순위"**(라우팅 `/account`·`/school` 유지).
- 페이지 최하단 보조 문구 추가: "레전드스터디+의 학습 시간을 기준으로 집계돼요"(작은 회색 텍스트, 아이콘·강조 없음).
- 참여 카드 ↔ 순위 카드 간격 **24px**(`.school-view__stack` flex gap, PC·태블릿·모바일 공통). 기존 `.school-view` gap은 OwnerArea 래퍼 때문에 카드 사이에 적용되지 않던 문제를 stack 래퍼로 해결. 다른 페이지 카드 간격 무영향.

### 19.2 공개 정책 통일 (PART B, 후보 RPC)
- **평균 공개 기준 5명 → 3명 폐지·통일**: 총공부시간·평균 모두 기록자 3명 이상 공개(`v_min_users` 5→3). 서버 상수 고정, 클라이언트 우회 파라미터 없음(기존 2-인자 시그니처 유지).
- **다른 학교 가입 학생 수 비공개**: `student_school_ranking`이 본인 학교만 `registered_users` 실제 값, 다른 학교는 **null 반환**(`pub_registered`). 순위 산출은 실제값 사용, 반환만 마스킹. 다른 필드로도 미노출.
- 기록자 3명 미만 학교: 총시간·평균·해당 순위 모두 null(간접 추정 불가 — 미달 학교는 total/avg 순위 제외, registered 순위는 count만 마스킹).

### 19.3 계약/파서 (PART D)
- `SchoolRankRow.registeredUsers: number|null`(다른 학교 null, 0 아님) — 파서 `nnum`. 화면에서 null은 **`**`**로 표시(0명 오인 방지). `ms`/`avgMs` 기존 nullable 유지.
- 카드(`SchoolCard`)는 본인 학교라 `registeredUsers` 실제 값 유지(변경 없음).

### 19.4 소규모 Growth UX (PART C) — 유지
가입 1~2명도 카드·초대 정상 표시. 기록자 3명 미만 잠금 안내("곧 열려요! N명이 더…")·친구 초대(OS 공유+클립보드 폴백) 기존 동작 유지.

### 19.5 검증 (읽기 전용)
- 밴드(합성): 기록자 0/1/2 총시간·평균 비공개, 3/4/5+ 공개 → **평균이 3명에서 공개** 확인. `pub_registered`는 본인 학교만.
- 실데이터 30d 후보 쿼리 실행(무변경): registered 자격 128곳 중 **가입 수 노출 1곳(본인 학교)**·나머지 null, 기록자 1~2명 ms/avg 유출 0, 평균 3+ 공개 로직 정상(현재 3+ 학교 0곳이라 빈 결과).
- 파서 테스트 29/29, TS 0, ESLint 0, 프로덕션 빌드(기록 중).

### 19.6 운영 적용/배포 대기 (PART F)
- **운영 RPC 미적용**: 후보 `supabase/candidates/student_school/install.sql`만 수정. 라이브 RPC는 평균 5명·가입수 미마스킹 상태 → **UI와 함께 적용·배포 필요**(순서: RPC apply → WEB deploy). UI만 먼저 배포 금지(라이브 RPC가 다른 학교 가입수 실제 반환).
- 승인 필요: (a) 학생 RPC 재적용(`student_school_v2`), (b) `/school`+`/account` WEB 재배포.
- 롤백: RPC는 직전 정의, WEB는 직전 canonical(`aaa350d6`).

## 20. 공부 순위 개선 운영 반영 — RPC v2 + WEB 재배포 (2026-11-10, Owner 승인)

Owner 승인으로 RPC v2 적용 + `/school`·`/account` 선별 재배포. 기존 관리자 RPC·테이블·인증 무변경.

### 20.1 적용된 migration
- `student_school_v2` — `student_school_ranking(p_period,p_metric)` 교체: 총시간·평균 모두 기록자 3+, 다른 학교 `registered_users` null 마스킹(본인 학교만 실제값). `student_school_card()`는 v1과 동일(미변경). 시그니처·권한 유지.
- v1 롤백본 보존: `supabase/candidates/student_school/rollback_v1.sql`(create-or-replace, 평균 5·마스킹 없음).

### 20.2 RPC 적용 후 검증 (WEB 배포 전)
- 정의: 평균 상수 3(`avg_is_3`), `pub_registered` 포함, 시그니처 `(p_period, p_metric)` 유지.
- 권한: authenticated/service_role/postgres=X, **anon/public 회수** 유지.
- 차단: 비로그인/무JWT card·ranking 모두 42501. 4-인자 우회 호출 42883(파라미터 없음).
- 공개 기준: 밴드(합성) 0/1/2 비공개·3/4/5+ 공개 — **평균 3명에서 공개** 확인.
- 가입자 마스킹(실데이터 30d): registered 순위 128곳 중 **가입 수 반환 1곳(본인)**·나머지 null. 다른 학교 가입자 수 API 응답 미포함 확인.
- 정합성: 30d `ms_consistent`=true(관리자 집계 일치). 기록자 1~2명 ms/avg 유출 0.
- 보안 권고: 적용 전후 동일(5건, 신규 0).

### 20.3 WEB 선별 재배포
- **배포 ID `4257db26`** / 소스 `9813b22`. **롤백 대상 `aaa350d6`**.
- 선별 오버레이: `/school/*` 5 + `/account/*` 20 + 신규 static 6, **범위 밖 변경 0건**. Functions 24 보존(소스 동일 재컴파일). Worker/라우팅/headers/redirects 보존.

### 20.4 배포 후 검증 (익명/빌드 레벨)
- canonical `4257db26` 승격 ✅. `/school/`·`/account/`·`/`·`/admin/`·`/pricing/` 200 ✅. `/api/essay/*` 401(동작) ✅.
- 라이브 `/school` 제목 "우리 학교 공부 순위" ✅. 하단 집계 안내 문구 번들 포함 ✅.
- NOT TESTED(실로그인): 카드 간격 24px 시각 확인, 다른 학교 가입자 '**' 표시, 본인 학교 실제값, 평균 3명 공개 표시, 랭킹/친구 초대/마이페이지 메뉴명, 모바일 레이아웃.

### 20.5 회귀·롤백·호환성
- 신규 회귀 0(파서 29/29, TS 0, ESLint 0, 빌드 통과; 기존 admin/materials 8 failed 기준선).
- 롤백: WEB은 canonical `aaa350d6` 복귀, RPC는 `rollback_v1.sql` 재적용. v2 WEB↔v2 RPC 계약 일치(registeredUsers nullable·시간 null 처리). v1 WEB↔v2 RPC도 안전(과거 UI는 number 기대였으나 현재 배포는 v2 UI이므로 불일치 없음; 롤백 시 WEB·RPC 동반 롤백 권장).

## 21. 참여 학생 수 랭킹 전환 + TOP10/주변 순위 + 학생 수 전면 비공개 (2026-11-10, 구현 완료 · 운영 적용/배포 대기)

운영 `/school` 개선: 3번째 지표를 **가입 학생 수 → 참여 학생 수(기간 내 실제 기록자)**로 전환. **운영 RPC·배포 변경 없음(후보/프런트만).** 적용·배포는 Owner 별도 승인.

### 21.1 랭킹 지표 변경 (PART B)
- 탭: 총 공부시간 / 1인당 평균 / **참여 학생 수**. 참여 학생 수 = 선택 기간 내 유효 공부시간을 1회 이상 기록한 고유 사용자 수(`active_users`, 중복 제거·include_in_study_total·유효계정·학교 등록자). 가입만 한 학생은 제외.
- 후보 RPC `student_school_ranking`: `p_metric='participation'`(및 과도기 별칭 `registered`) → 정렬값 `active_users`, 자격 `active>=1`(0명 제외). 기존 시그니처 유지, 우회 파라미터 없음.

### 21.2 학생 수 전면 비공개 (PART C)
- 본인 학교만 `registered_users`·`active_users` 실제값, **다른 학교는 둘 다 null**(`pub_registered`·`pub_active`). 순위(rnk)는 서버에서 실제값으로 산출하고 반환 수치만 마스킹 — 원본 학생 수를 클라이언트에 전달하지 않음(정렬 키·메타 포함 미노출).
- 화면: 다른 학교 학생 수 `**`. 참여 탭 보조 컬럼은 '가입 학생 수', 그 외 탭은 '참여 학생 수'로 구성해 숫자 중복 방지.

### 21.3 TOP10 + 우리 학교 주변 순위 (PART D)
- `rnk`=동률 공동 순위(rank, 동률 같은 번호), `ord`=안정 표시 순서(row_number, 동률은 학교 코드). 둘을 분리.
- TOP10 = `ord<=10`(표시 순서), 각 행 순위는 `rnk`. 주변 = 우리 학교가 TOP10 밖(`m_ord>10`)일 때만 `ord` 기준 앞뒤 2행, **TOP10과 중복(ord<=10) 제외**. 서버 계산(클라이언트 재계산 없음).

### 21.4 공개 기준 유지 (PART E)
총공부시간·1인당 평균 모두 기록자 3명 이상 공개(미달 null) 유지. 소규모 잠금 안내·친구 초대 유지. 참여 학생 수 랭킹은 1명부터 참여(총시간/평균 3명 기준과 구분).

### 21.5 계약/파서 (PART F)
`SchoolRankMetric` 'registered'→'participation'. `SchoolRankRow.activeUsers`·`registeredUsers` 모두 `number|null`(다른 학교 null, 0 아님→`**`). `rank`는 동률 반영 번호(표시 행 번호와 구분).

### 21.6 검증 (읽기 전용)
- 참여 랭킹(실데이터 30d): 참여 학교 **12곳**(active≥1; registered 기준 128곳과 구분됨), TOP 10 캡, 전원 동률 → **공동 1위(distinct rnk=1)**·ord 1..12. 본인 학교만 가입·참여 수 반환(각 1곳), 나머지 null.
- 주변 순위(own ord=12 강제): around=ord 11·12(둘 다 rnk 1), **TOP10(ord≤10) 제외 확인**. 동률 시 순위 번호 비연속 확인.
- 파서 29/29, TS 0, ESLint 0, 빌드 통과.

### 21.7 운영 적용/배포 대기
- 후보 SQL만 수정(운영 RPC는 v2=registered 기준). 적용 시 **RPC 교체 + /school·/account WEB 재배포 동반 필요**(과도기: v2 UI가 active=null을 못 받으면 가드로 "준비 중" 표시 — 크래시 없음). 승인 필요: RPC v3 apply + WEB 재배포. 롤백: WEB canonical `4257db26`, RPC `rollback_v1.sql`(또는 v2 재적용).

## 22. 참여 학생 수 랭킹 v3 운영 반영 — RPC v3 + /school 재배포 (2026-11-10, Owner 승인)

Owner 승인으로 RPC v3 적용 + `/school` 선별 재배포. `/account`는 변경 없어 미배포(검증). 관리자 기능·DB 테이블 무변경.

### 22.1 v2 백업 + 적용 migration
- v2 롤백본 보존: `supabase/candidates/student_school/rollback_v2.sql`(평균3·registered 기준·가입수만 마스킹). v1(`rollback_v1.sql`)과 구분.
- `student_school_v3` — `student_school_ranking` 교체: participation(active 기준) 지표, 다른 학교 registered·active 모두 null, rnk/ord 분리, TOP10+주변(ord). 카드 미변경, 시그니처 유지.

### 22.2 RPC 적용 후 검증 (WEB 배포 전)
- 정의: 시그니처 `(p_period,p_metric)`, participation 정렬(`active_users`), `pub_active` 마스킹, `rank`+`row_number` 모두 포함. 권한 authenticated 전용(anon/public 회수).
- 차단: 비로그인 card·ranking 42501(인증 게이트가 metric 검증보다 선행).
- 참여 집계: 참여 학교 **13곳**, 참여 0명 학교 **116곳 제외**, 1명 이상 포함. 중복 제거(distinct user).
- 마스킹: 본인 학교만 가입·참여 수 반환(각 1곳), 다른 학교 둘 다 null.
- 공동 순위: TOP10 내 distinct rnk 2(동률 발생), rnk=공동순위·ord=표시순서 분리 동작.
- 총시간/평균 3명 기준 유지. 보안 권고 적용 전후 동일(5건, 신규 0).

### 22.3 WEB 배포
- **배포 ID `6a5e2466`** / 소스 `34938a1`. **롤백 대상 `4257db26`**.
- 선별 오버레이(`/school` 전용): `/school/*` 5 + 신규 static 4, **범위 밖 변경 0건**. `/account` 변경 없음 확인(미배포). Functions 24 보존(소스 동일 재컴파일).

### 22.4 배포 후 검증 (익명/빌드 레벨)
- canonical `6a5e2466` 승격 ✅. `/school/`·`/account/`·`/`·`/admin/`·`/pricing/` 200 ✅. `/api/essay/*` 401(동작) ✅. 운영 번들에 "참여 학생 수" 탭 포함 ✅.
- NOT TESTED(실로그인): 참여 학생 수 탭 표시, 다른 학교 '**', 본인 학교 실제값, 공동 순위 표시, TOP10/주변 순위, 기간 선택, 친구 초대, 마이페이지 진입.

### 22.5 회귀·롤백·호환성
- 신규 회귀 0(파서 29/29, TS0, ESLint0, 빌드 OK; 기존 admin/materials 8 failed 기준선).
- 롤백: WEB canonical `4257db26` 복귀, RPC `rollback_v2.sql` 재적용(v2). v3 WEB↔v3 RPC 계약 일치(active nullable). 롤백 시 WEB·RPC 동반 권장.

## 23. 참여 탭 기본화 + 전체 기간 기본 + 탭명 변경 (2026-11-10, 구현 완료 · 운영 적용/배포 대기)

실로그인 화면 확인 후 Owner 피드백 반영. **후보 RPC+프런트만, 운영 변경/배포 없음.**

### 23.1 변경
- 3번째 탭 이름 **"참여 학생 수" → "참여 학생 수 Top 학교"**(탭 라벨만; 표 컬럼 머리글은 '참여 학생 수' 유지).
- 기본 선택 탭 = **참여 학생 수(participation)**, 기본 기간 = **전체 기간**.
- 기간 옵션에 **'전체 기간'(all)** 신설(맨 앞). 후보 RPC `student_school_ranking`에 `p_period='all'` 추가(from=1970-01-01, 서비스 시작 이후 전체). week/last_week/month 유지. 시그니처·카드 미변경.
- 계약 `SchoolRankPeriod`에 'all' 추가, 파서 허용.

### 23.2 검증(읽기 전용)
- 전체 기간 집계(from 1970): 참여 학교 12곳·최대 2명·총 13행(30d=12곳·최대 1명·12행) — 더 넓은 창 정상 집계 확인. SQL 오류 없음.
- 파서 29/29, TS 0, ESLint 0, 빌드(기록 중). 기존 탭/마스킹/공동순위 로직 불변.

### 23.3 운영 적용/배포 대기
- 후보 SQL만 수정(운영은 v3=week/last_week/month). 적용 시 **RPC v4(기간 all 추가) + /school WEB 재배포 동반 필요**. 승인 필요. 롤백: WEB canonical `6a5e2466`, RPC `rollback_v2.sql`(v2) 또는 v3 재적용.

## 24. 참여 탭 기본화 + 전체 기간 운영 반영 — RPC v4 + /school 재배포 (2026-11-10, Owner 승인)

Owner 승인으로 RPC v4(기간 all 추가) 적용 + `/school` 재배포. `/account` 변경 없어 미배포. 관리자·DB 테이블 무변경.

### 24.1 백업 + migration
- v3 롤백본 보존: `supabase/candidates/student_school/rollback_v3.sql`(participation·all 없음). v1/v2와 구분.
- `student_school_v4` — `student_school_ranking`에 `p_period='all'`(from 1970) 추가. 그 외 v3와 동일(participation·마스킹·rnk/ord·TOP10/주변). 카드·시그니처 미변경.

### 24.2 RPC 검증 (배포 전)
- 정의: 기간 목록 `week/last_week/month/all` 포함, all-time from 1970 포함, 시그니처 유지, authenticated 전용(anon/public 회수).
- 차단: 비로그인 42501. 보안 권고: 시그니처·권한 v3와 동일한 body-only 변경 → 신규 없음.

### 24.3 WEB 배포
- **배포 ID `4986657a`** / 소스 `b56af2a`. **롤백 대상 `6a5e2466`**.
- 선별 오버레이(`/school` 전용): `/school/*` 5 + 신규 static 4, **범위 밖 변경 0건**. `/account` 미변경. Functions 24 보존.
- 변경: 3번째 탭명 "참여 학생 수 Top 학교"(컬럼 머리글 '참여 학생 수' 유지), 기본 탭=참여, 기본 기간=전체 기간, '전체 기간' 옵션 신설.

### 24.4 배포 후 검증 (익명/빌드)
- canonical `4986657a` 승격. `/school/`·`/account/`·`/`·`/admin/`·`/pricing/` 200. `/api/essay/*` 401(동작). 번들에 "참여 학생 수 Top 학교"·"전체 기간" 포함.
- NOT TESTED(실로그인): 기본 진입 시 참여·전체 기간 선택 상태, 전체 기간 집계 표시, 탭명 노출.

### 24.5 롤백·호환성
- WEB canonical `6a5e2466`, RPC `rollback_v3.sql`(v3) 또는 v2. v4 RPC는 기간만 추가라 v3 WEB와도 하위호환(기존 기간 동작 동일). 신규 회귀 0.

## 25. Phase 3 친구 초대·가입 전환·첫 학습·D7 유지 추적 (2026-11-10, 설계·구현 완료 · 운영 적용/배포 대기)

초대가 실제 신규 가입·학습 활성화로 이어지는지 측정하는 Growth 시스템. **운영 DB·RPC·인증·배포 변경 없음(후보 SQL + 프런트 구현 + 테스트 + 설계만).** 운영 적용·배포는 Owner 별도 승인.

### 25.1 기존 시스템 분석(교차 검증)
- 기존 invite/referral/campaign 테이블 **없음**(클린). 가입=Supabase Auth(`signUp`/OAuth) + `profiles` 트리거(`account_lifecycle_*`,`essay_signup_credit`) → **signup_at=profiles.created_at**.
- 공부시간: `study_sessions.include_in_study_total` + `active_segments`(end>start) — 기존 정책 재사용(신규 집계 안 함).
- 분석: `analyticsEvents`(GA4 미러) + `logAnalytics`. **GA4는 `NEXT_PUBLIC_ANALYTICS_ENABLED` 게이트인데 운영 env에 없음 → GA4 미연결(이벤트 전송 off)**. 설계만 반영, 실제 전송은 NOT TESTED.
- 정적 export라 `/invite/[token]` 서버 라우트 불가 → `/invite?t=<token>` 클라이언트 토큰 처리.

### 25.2 신규 DB 테이블·인덱스(후보, 미적용)
`supabase/candidates/invite_growth/install.sql`
- `invite_tokens`(token_hash unique, inviter_user_id, office/school_code, campaign, created/expires/revoked_at) — **raw 토큰 비저장, sha256 해시만**. idx(inviter,created),(office,school).
- `invite_visits`(invite_token_id, visitor_hash, source, visited_at, unique(token,visitor)) — 방문자=클라이언트 난수 해시(개인정보 아님), 중복 1행.
- `invite_attributions`(invite_token_id, invited_user_id **unique**, signup_at, school_confirmed_at, first_study_at, d7_retained_at, d7_evaluated_at) — 신규 가입자 1회 귀속.
- 3개 테이블 RLS enable, 직접 접근 정책 없음(기본 거부) → 모든 접근은 SECURITY DEFINER RPC 경유.

### 25.3 신규 RPC/API(후보, 미적용)
- `invite_create(campaign)` — 로그인 발급, raw 토큰 1회 반환(서버 해시 저장), 초대자 학교 스냅샷.
- `invite_lookup(token)` — anon 허용, 유효성+학교코드만(초대자 신원 비노출).
- `invite_record_visit(token,visitor,source)` — anon 허용, 중복 제거.
- `invite_attribute_signup(token)` — 본인, 자기초대/기존회원/중복 차단, 7일 귀속.
- `invite_mark_school_confirmed()` / `invite_refresh_milestones()`(첫 학습·D7 멱등 갱신) / `invite_my_performance()`(초대자 본인 집계) / `admin_invite_growth(from,to)`(operator, 전체+학교별+전환율·D7율).
- 권한: 생성/귀속/성과/관리자=authenticated, 조회/방문=anon+authenticated. 토큰은 권한 부여 수단 아님.

### 25.4 귀속·전환 로직
- 초대 기반 가입: 토큰 방문 후 신규 계정 생성(signup_at ≥ token.created_at, 가입 7일 이내), 기존 회원·자기 가입 제외, invited_user 1회.
- 첫 학습: 가입 이후 최초 유효 공부시간(>0) 세션 시각. 타이머 실행/화면 방문만으로 인정 안 함.
- D7: 가입 D0(KST)+7일째 날짜에 유효 공부시간 존재 시 유지. 관찰 기간 미도래(아직 D7 안 지남)면 미평가(d7_evaluated_at null)→유지율 분모 제외.

### 25.5 WEB 구현(가드/휴면 — RPC 미적용 시 현행 동작)
- `/invite` 랜딩(`src/app/invite/page.tsx`+`invite-landing.tsx`): 토큰 조회→초대 학교명 표시/일반 초대/만료·무효 폴백, 방문 기록, 토큰 보관(가입 후 귀속).
- `SchoolInviteConnected`: 토큰 생성 후 초대 URL 주입(캐시), RPC 부재 시 기존 공개 랜딩 URL 폴백(무회귀). 공유 이벤트.
- `InviteAttributionPrompt`(/school 상단): 로그인+보관 토큰 시 귀속→학교 확인 카드(사용자 확인 후 설정, 자동확정 금지).
- 데이터 계약 `src/lib/invite/contract.ts`(파서+가드 래퍼+visitorId+pending token). 테스트 7/7.

### 25.6 GA4 이벤트 설계
`school_invite_click/share/link_open/signup/school_confirmed/first_study/d7_retained` + param `campaign` 추가(`analyticsEvents`). first_study/d7는 서버 마일스톤 기반(클라 전송은 로그인 세션에서). **GA4 운영 미연결 → 실제 전송 NOT TESTED.**

### 25.7 Flutter APP 연동(설계만)
- 앱 링크(Universal/App Links)로 `/invite?t=` 수신 → 동일 Backend RPC 호출. 네이티브 UI 유지(WebView 금지).
- 미설치→설치 후 토큰 복원(deferred deep link)은 플랫폼별 지원 확인 필요 — **미지원 시 구현 완료로 보고하지 않음**(현재 미구현).

### 25.8 보안·중복 방지
외부 URL raw 토큰만(내부 UUID/이메일 비노출), 추측난이 128bit, 서버 유효성 검증, 자기초대 차단, invited_user unique(중복 귀속 금지), visit unique(중복 방문 금지), 개인 학습기록 비공개, 기존 RLS/인증 보존, 관리자 operator 게이트. 토큰=식별용(권한 아님).

### 25.9 검증·테스트
- 읽기전용: 토큰/해시 패턴 OK, 첫 학습 탐지(실유저 signup→first_study 정상), D7 경계(KST signup+7일) 정상, invite* 테이블 충돌 0.
- 파서 7/7, 전체 학교 파서 29/29, TS 0, ESLint 0, 빌드(기록 중). 기존 /school·공부시간 기능 보존.

### 25.10 운영 적용 필요 / Owner 승인 요청
1. 후보 스키마+RPC 운영 `apply_migration`(invite_tokens/visits/attributions + RPC 8종). 적용 전 `test.sql`·`get_advisors` 신규 권고 0.
2. `/school`+`/invite` WEB 재배포(연결 버튼·랜딩·귀속 활성화).
3. GA4 운영 연결(`NEXT_PUBLIC_ANALYTICS_ENABLED`) — 미연결 상태.
4. 관리자 Growth 분석 화면(이번 미구현, admin_invite_growth RPC만 설계) · Flutter 딥링크 — 각 별도 승인.

## 26. Phase 3 운영 적용 전 최종 검증·보완 (2026-11-10, 운영 변경 없음)

Owner 최종 검증 승인에 따른 보완. **운영 DB·배포·권한 변경 없음(후보 SQL·프런트 수정만).**

### 26.1 가입 전환 귀속 구조 (§2)
- 귀속을 **/school 비의존**으로 전환: `InviteAttributionWatcher`를 **루트 레이아웃(AuthProvider 내부)에 전역 마운트** → 로그인 후 **어느 페이지에서도** `invite_attribute_signup` 실행(누락 방지). 인증 시스템 자체는 미변경(기존 Supabase Auth 완료 흐름에서 보관 토큰 복원).
- 학교 확인 UI(`InviteAttributionPrompt`)는 성장 페이지(/school)에 유지하되, 귀속과 분리 — watcher가 세션스토리지로 학교코드를 전달하면 카드가 표시(사용자 확인 후 설정, 자동확정 금지).

### 26.2 첫 학습·D7 집계 (§3)
- `invite_my_performance`·`admin_invite_growth`를 **저장 컬럼 비의존·study_sessions 실시간 재계산**으로 재작성 → 특정 페이지 방문 없이 서버에서 정확 집계, **기록 삭제·수정 즉시 정합**. 저장 컬럼(first_study_at/d7_retained_at)은 선택적 캐시.
- D7은 관찰 기간(가입+7일 KST) 도래분만 분모(`d7_eligible`), 미도래 제외. 읽기전용 검증: 5건 중 first_study 5(100%), d7_eligible 2(미도래 3 제외), 로직 정상.

### 26.3 비로그인 RPC 보안 (§4)
- `invite_lookup`/`invite_record_visit`: anon 허용, `search_path=''`, SECURITY DEFINER, p_token `^[0-9a-f]{64}$` 정규식 검증(동적 SQL 없음=SQLi 불가), 만료/폐기/부재 토큰 거부.
- 응답 최소화: lookup={valid, office/school_code, has_school, campaign}, visit={recorded}뿐 — **회원·학습·초대자 신원 데이터 미포함**. 토큰 128bit→대량 열거 불가. 방문 중복은 unique(token,visitor)로 1행.

### 26.4 토큰 정책 (§5)
- 128bit 난수, **sha256 해시만 저장**(raw 미저장), 만료 90일, 폐기(`revoked_at` + 신규 `invite_revoke_mine()` RPC). 자기초대 차단(귀속 단계), 동일 사용자 중복 토큰은 **클라이언트 디바이스 캐시**로 완화(해시 전용이라 서버 재발급 불가=의도된 보안 트레이드오프). 토큰은 권한 부여 수단 아님.

### 26.5 WEB 가입 흐름 (§6)
- A 비로그인 신규(링크→랜딩→가입→학교 확인→학습): 구현. B 기존 회원(로그인→기존 판정→전환 제외): 구현(attribute가 신규 가입 조건 미충족 시 제외). D 학교 미등록(학교 선택→학습): 구현(학교 확인 카드/`/account`). **C 앱 미설치→설치 후 복원: NOT IMPLEMENTED**(deferred deep link 플랫폼 지원 확인 필요).

### 26.6 관리자 Growth 집계 (§7)
- `admin_invite_growth`가 GA4 미연결에도 **DB만으로** 방문/가입/첫학습/첫학습률/D7유지율/학교별 산출(실시간 재계산). GA4는 보조.

### 26.7 성능·비용 (§8)
- 증가량: tokens≈초대자×디바이스, visits≈unique(token,visitor)(중복 1행), attributions≈신규 가입. 인덱스: inviter/created, office/school, visits(token), attributions(token)+invited_user unique. 집계는 study_sessions 재계산이라 호출 빈도 높은 관리자 뷰는 향후 사전 집계/캐시 검토(현재 소규모 충분). 방문 저장 단순화 옵션: visitor 해시 미보관·토큰별 카운트만(단 중복 제거 정밀도↓) — 제안만, 현행은 정밀 중복 제거 유지.

### 26.8 테스트·회귀
- 파서 36/36(초대 contract 포함)·TS0·ESLint0·빌드(기록 중). 기존 학교 순위 29/29 보존. RPC 시나리오(생성/방문/가입/자기초대/만료/폐기/비로그인/권한우회/삭제정합)는 적용 후 실행 — `test.sql`에 설계·읽기전용 검증 포함.

### 26.9 운영 적용 시 위험 요소 / Owner 승인 필요
- 위험: (a) 신규 테이블/RPC 적용(기존 객체 무변경이나 DDL), (b) anon 실행 권한 2종(lookup/visit) — 응답 최소화·토큰 검증으로 완화, (c) GA4 미연결 상태 전송 없음, (d) 관리자 집계 study_sessions 재계산 비용(소규모 OK). 롤백: 신규 객체 drop(기존 영향 없음).
- 승인 필요: ① 스키마+RPC(9종) apply(+`get_advisors` 0 확인), ② `/school`·`/invite`·루트 레이아웃 WEB 배포, ③ GA4 연결, ④ 관리자 Growth 화면·Flutter 딥링크(별도).

## 27. Phase 3 운영 적용 — 스키마+RPC 적용 + 전역 WEB 배포 (2026-11-10, Owner 승인)

Owner 승인으로 초대 추적 스키마+RPC 적용 + Phase 3 WEB 운영 배포. GA4 연결·Flutter·관리자 UI는 제외.

### 27.1 적용 migration / 신규 객체
- `invite_growth_v1` — 신규 테이블 3(`invite_tokens`·`invite_visits`·`invite_attributions`) + RPC 9종. **기존 테이블·RPC 무변경**. 롤백본 `rollback.sql`(신규 객체 drop만).

### 27.2 RPC 검증 (WEB 배포 전, 게이트 통과)
- 구조: 신규 테이블 3·RLS 전부 on(직접 접근 정책 없음=기본 거부, RPC 경유), 9 RPC 전부 SECURITY DEFINER·`search_path=''`, anon 실행은 `invite_lookup`·`invite_record_visit` 2종만, unexpected 0.
- 동작(롤백 트랜잭션, 데이터 미잔존): self_invite→self_invite, 기존 계정→**not_new_signup**(가입 시점=profiles.created_at 사용), 만료→expired, 폐기→revoked, 비정상 토큰→invalid, 유효 lookup 반환키=`campaign,has_school,office_code,school_code,valid,version`(**회원·학습·초대자 신원 미포함**). 중복 귀속=invited_user unique+already로 차단.
- 보안 권고: 적용 전후 동일(5건, 신규 카테고리 0). 초대 객체는 기존 `rls_enabled_no_policy`(RPC 전용 설계)·`*_security_definer_*` 범주에 포함.
- **NOT TESTED**: 실제 신규 계정 가입→귀속 happy-path(attributed:ok)는 실가입 필요.

### 27.3 전역 Watcher 배포 방식 (§3)
- 루트 레이아웃에 `InviteAttributionWatcher` 추가 → **앱 전역 변경**(선별 /school 오버레이 불가). `git diff b56af2a(운영 소스)..842f9c6`가 **Phase 3 파일만** 변경 확인 → 기존 페이지 변화는 공유 레이아웃/CSS 청크 참조뿐(내용 회귀 없음).
- **전체 사이트 오버레이**(worker/Functions/headers/routes 베이스라인 보존): dry-run 변경 797·추가 19(/invite 5+청크)·**드롭된 기존 페이지 0**·Functions 24 보존.

### 27.4 운영 배포
- **배포 ID `8243116d`** / 소스 `842f9c6`. **롤백 대상 `4986657a`**. Functions/Worker 바이트 보존(동일 소스 재컴파일).

### 27.5 배포 후 검증 (익명/빌드)
- canonical `8243116d` 승격. `/invite`·`/school`·`/account`·`/`·`/admin`·`/pricing`·`/signup`·`/login`·`/essay-lab`·`/math` **전부 200**. Functions essay 401·payments 403(동작). `/invite` 랜딩 서빙.
- **NOT TESTED(실로그인/실가입)**: 초대 생성·복사·방문기록·신규가입 귀속·기존회원 제외·학교 확인·첫학습/D7 실동작·공유 링크. 관리자 집계는 DB 기반 동작(실데이터 축적 후 확인).

### 27.6 모니터링·롤백
- 모니터링: 초대 생성/방문/귀속 오류, 중복 귀속, 기존회원 오분류, 비정상 방문 급증. GA4 미연결에도 `admin_invite_growth` DB 집계 동작.
- 롤백: WEB canonical `4986657a` 복귀. DB는 **실제 초대 데이터 생성 후 무조건 drop 금지** — 기존 기능 복구 우선·데이터 보존 확인 후 `rollback.sql`. 신규 객체 drop은 기존 기능 무영향.

### 27.7 후속(승인 제외)
GA4 운영 연결, 관리자 Growth UI, Flutter 딥링크(흐름 C deferred deep link=NOT IMPLEMENTED), 실가입 end-to-end 귀속 검증.

## 28. 관리자 대시보드 '학습·입시 종합 현황' 개편 — 희망/실제지원 분리 (2026-11-10, 구현 완료 · 운영 적용/배포 대기)

학생 입시 데이터(희망 대학·전공·실제 지원·전형)를 세분화. **운영 변경/배포 없음(후보 RPC+UI). 기존 `admin_learning_analytics` 미변경.**

### 28.1 문제(검증)
- 기존 카드는 희망/실제지원을 "학생수/기록수" 단일 틀로 표시. 근거: `student_target_universities`는 `UNIQUE(user_id,university_id,admission_year)` → 대학별 **학생수==기록수(중복 컬럼)**. 두 수가 갈라지는 건 전체 평균(229÷133=1.72개교)뿐.
- `student_applications`는 dedup UNIQUE 없음 → 한 학생이 같은 대학에 복수 전형/학과 지원 가능 → **기록수≫학생수가 정상**. 희망과 같은 틀로 보면 안 됨.

### 28.2 개편(후보)
- 신규 RPC `admin_admissions_analytics(p_from,p_to)`(후보, 미적용) — 기존 RPC 불변. 희망/실제지원을 **서로 다른 축**으로 반환:
  - 희망: students·records·avg_per_student·major_students, 대학 TOP(학생수·**1지망(priority=1)**), **희망 전공 TOP**(profiles.intended_major, 현재 스냅샷).
  - 실제 지원(고3+N수): eligible·students·records·**coverage_pct**·avg_per_student, 지원 대학 TOP(**지원수·학생수 분리**), **전형구분 분포**.
- UI: 단일 '학습·입시 종합 현황' → **'희망 대학·전공 현황' + '실제 지원 현황·고3·N수' 2개 패널**. 대학별 중복 "기록 수" 제거, 희망 전공 분포(Bars) 신설, 실제 지원은 지원수/학생수·전형 분리.
- 권한: admin_operator 게이트, SECURITY DEFINER, search_path='' (기존 관리자 RPC와 동일 패턴).

### 28.3 읽기전용 검증
- 희망 229건/133명·평균 1.72개교·1지망 130, 대학별 학생수==기록수 확인. **희망 전공 178명/8분류(사회·상경37·공학36·인문30·의약24·예체능18…)** — 기존 대시보드에 없던 축.
- 실제 지원 대상(고3+N수) 318명 중 입력 1명(0.3%)·2건. 전형 '수시'. 복수지원 구조 반영.
- TS 0·ESLint 0·빌드(기록중). 전체 스위트 8 failed=기존 기준선(신규 회귀 0, dashboard-focus 실패는 기존 release-report mock 이슈로 본 변경과 무관).

### 28.4 운영 적용/배포 대기
- 후보 `supabase/candidates/admissions_analytics/{install,test}.sql`. 적용 시 `admin_admissions_analytics` apply + 관리자 대시보드 WEB 배포 동반 필요. 승인 필요. 기존 `admin_learning_analytics`·인기자료·KPI 타일 불변.
- 참고: 실제 지원 입력 유도 온보딩은 코덱스가 별도 담당. 합격 발표 알림은 `student_application_events`(accepted/rejected/registered 등) 기반 확장 가능(차기).

## 29. 관리자 대시보드 입시 개편 운영 반영 — RPC 적용 + /admin 배포 (2026-11-10, Owner 승인)

Owner 승인으로 `admin_admissions_analytics` 적용 + 관리자 대시보드 `/admin` 선별 배포. 기존 `admin_learning_analytics` 불변.

### 29.1 적용 migration
- `admin_admissions_analytics_v1` — 신규 RPC(희망 대학/전공 vs 실제 지원 분리 집계). **기존 객체 무변경**. 롤백본 `rollback.sql`(drop function).

### 29.2 RPC 검증 (배포 전)
- 비operator 호출 **42501 차단**, SECURITY DEFINER, `search_path=''`, 8s, authenticated 전용(anon/public 회수). 보안 권고 신규 카테고리 0(기존 admin RPC 동일 패턴).
- 집계 수치는 operator 세션 필요라 **NOT TESTED**(인라인 읽기전용으로 희망 229/133·전공 178명·지원 0.3% 검증 완료, 함수 본문 동일).

### 29.3 WEB 배포
- **배포 ID `49aa7647`** / 소스 `7c195a1`. **롤백 대상 `8243116d`**. 선별 오버레이(`/admin` 전용): `/admin/*` 150페이지 + static 5, **범위 밖 변경 0건**(공개/학생 페이지 무변경). Functions 24 보존.

### 29.4 배포 후 검증 (익명/빌드)
- canonical `49aa7647` 승격. `/admin`·`/admin/data/learning`·`/school`·`/account`·`/`·`/invite`·`/pricing` 전부 200. Functions 401(동작). 운영 admin 번들에 `admin_admissions_analytics` 호출 코드 포함.
- NOT TESTED(operator 로그인): 실제 대시보드 두 패널 렌더·수치(희망 대학·전공 TOP·1지망, 실제 지원 입력률·전형 분포).

### 29.5 롤백
- WEB canonical `8243116d` 복귀. RPC `rollback.sql`(신규 함수 drop, 기존 기능 무영향). 신규 회귀 0(기존 8 failed 기준선).

## 30. 입시 성과(합격 현황) 집계 — 마케팅/BM 소셜 프루프 (2026-11-10, 구현 완료 · 운영 적용/배포 대기)

BM 논의(합격=최강 소셜 프루프 레버)에 따라 관리자 대시보드에 합격 현황 집계 추가. **운영 변경/배포 없음(후보 RPC+UI). 기존 객체 불변.**

- 신규 후보 RPC `admin_admission_outcomes(p_from,p_to)`(미적용): 지원별 "현재 상태"(created/details_changed 제외 + 미대체 최신 이벤트 = 기존 latest_event 동일 기준)로 최종합격(accepted+additional)·1단계합격·불합격·등록·미등록·진행, 합격률(최종합격÷(합격+불합격)), 합격 대학/전형 TOP. 개인 식별 없이 집계만. admin_operator 게이트.
- UI: '입시 성과 · 합격 현황' FocusSection 추가(기존 패널 유지). 발표 전/데이터 없음 상태 안내, 자기신고 명시.
- 검증(읽기전용): 현 지원 2건(stage_pass 1·submitted 1, 최종합격 0, 이벤트 1) 정상 집계. 발표 시즌/코덱스 온보딩 후 데이터 축적 시 활성. TS0·ESLint0·빌드 OK, 전체 8 failed=기존 기준선(신규 회귀 0).
- BM 활용: "사용자 N명 합격" 소셜 프루프, 대학/전형별 합격률 → 타게팅·전환·초대 루프 결합. 향후 내신·모의 연결 시 "합격 예측" 유료 기능의 기반.
- 후보 `supabase/candidates/admission_outcomes/{install,test}.sql`. 적용 시 RPC apply + /admin 배포 동반(Owner 승인). 롤백: drop function.

## 31. 입시 성과(합격 현황) 운영 반영 — Owner 보완 반영 + RPC 적용 + /admin 배포 (2026-11-10)

Owner 보완 확정 반영 후 `admin_admission_outcomes` 적용 + `/admin` 배포. 기존 테이블·RPC 불변.

### 31.1 Owner 보완(확정 반영)
- **합격 이력 보존**: 최종합격 = 미대체 accepted/additional_acceptance **EXISTS**(현재 상태만 안 봄). 등록/미등록 이후에도 합격 보존. 지원 건당 1회(중복 방지). 1단계 합격은 최종합격 미포함.
- **두 합격률**: A 지원 건 합격률=최종합격÷(최종합격+불합격), B 학생 합격 경험률=최종합격경험학생÷결과입력학생. **분모 0 → '집계 전'**(0% 아님). 결과 미입력 제외.
- **자기신고 안내**: "학생이 직접 입력한 입시 결과를 기준으로 집계합니다." UI 명시, 검증 합격과 혼합 안 함.

### 31.2 migration / RPC 검증
- `admin_admission_outcomes_v1`(신규, 기존 불변). 롤백본 `rollback.sql`(drop).
- 비operator **42501 차단**, SECURITY DEFINER, `search_path=''`, authenticated 전용(anon/public 회수). 기존 admin_learning_analytics·admin_admissions_analytics 유지 확인. 보안 권고 신규 카테고리 0.
- 동작(롤백 tx): accepted→registered여도 **has_accept 보존**·건당 1회, 현 데이터 합격률 null(집계 전). 학생/지원 분모 분리 확인.

### 31.3 WEB 배포
- **배포 ID `c94a93e7`** / 소스 `843f23d`. **롤백 대상 `49aa7647`**. 선별 오버레이(/admin): `/admin/*` 150 + static 5, **범위 밖 0**(공개/학생 무변경), Functions 24 보존.

### 31.4 배포 후 검증
- canonical `c94a93e7` 승격. `/admin`·`/school`·`/account`·`/`·`/invite`·`/pricing` 200, Functions 401. 운영 admin 번들에 `admin_admission_outcomes`·'입시 성과' 포함.
- NOT TESTED(operator): 실제 패널 렌더·합격/추가합격 집계·1단계 별도·불합격/등록/미등록·두 합격률·합격 대학/전형 TOP·데이터 없음 상태·기존 희망/실제지원 패널 유지.

### 31.5 집계 수치(읽기전용, 현재)
지원 2건·최종합격 0·1단계만 1·확정 0 → 두 합격률 '집계 전'. 발표 시즌/온보딩 후 축적.

### 31.6 롤백
WEB canonical `49aa7647`. RPC `rollback.sql`(drop, 기존 무영향). 신규 회귀 0(전체 8 failed 기준선).
