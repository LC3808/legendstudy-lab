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
