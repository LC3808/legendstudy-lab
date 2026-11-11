후속 2026-11-11 TASK05-B: 신규 조회 RPC 2개 조건부 운영 승인 후 사전 검사를 진행했으나 기존 대시보드 전체기간 API 계약 결함으로 적용 중단. 아래 ‘승인 대기’는 최초 보고 당시 상태이며, 최신 결과는 [TASK05-B 보고](admin-withdrawal-rpc-preflight-20261111.md)를 따른다. 운영 SQL·WEB 미적용 상태는 유지한다.

# 작업 05 — Claude 관리자 인수 · 탈퇴 관리 후보

2026-11-11 KST. **신규 기능 구현·격리 검증 완료 / 운영 미적용. 종합 PARTIAL**: 공통 관리자 검사에 기존 실패가 남고, 신규 RPC·WEB의 운영 검수는 별도 승인 이후다. 실제 삭제·계정 상태 변경·지급·차감·결제·평가·스토어 제출은 실행하지 않았다.

## 1. 인수 기준과 실제 운영

| 구분 | 확인 결과 |
|---|---|
| 원본 Claude checkout | `/Users/woojinchang/development/legendstudy-lab`, `claude/admin-ux-overhaul-20261109`, `643f68e`, 작업 전후 clean |
| 원격 Claude | `d4ceb2a` — 로컬643f68e 이후 변경은 구독 로드맵 Wiki뿐 |
| Codex branch | `codex/admin-withdrawal-management-20261111`, 기준 `d4ceb2a` |
| Codex checkout | `/Users/woojinchang/.codex/worktrees/admin-withdrawal-management-20261111/legendstudy-lab` |
| origin/main | `8991b510d2c9702ecfb05315fe21363ab6df7012`, 기준 브랜치보다409커밋 이전. 운영 기준으로 사용하지 않음 |
| Cloudflare canonical 실조회 | `9788a7ca-28c3-4437-9c7e-c20710176bd4` |
| 배포 source / 시각 | `0eefc7d880b4ffe9d560b1b7a60c7b4cd713cd90` / 2026-11-10 20:32:46 KST |
| 배포 차이 | 운영 source는d4ceb2a의 조상. scoped admin overlay로 배포됐으므로 Git main 전체를 배포물로 추정하지 않음 |

[Claude 기존 개편](admin-ux-overhaul-20261109.md), [대시보드·회원](admin-member-dashboard-20261104.md), [회원 자료·메뉴](admin-member-activity-navigation-20261104.md), [최신 WEB 인수인계](codex-handoff-learning-admissions-20261111.md)를 읽고 실제 코드와 대조했다. 기존 Wiki 첫 부분의11/4 배포 설명은 역사적 기록이며 현재 canonical은 위 실조회다.

기존 구현: 대시보드 상단6KPI·기간·경고·회원구성·입시/지원/합격·최근가입, 회원 검색/상태·학교/학년 필터·정렬/서버 페이지네이션·상태칩·상세/Student360/이용권 패널이 존재한다. teal/청회색·좌측정렬·고정헤더 디자인을 계승했다. 코드는 존재하나 모든 기존 화면을 실사용 운영자로 재검수한 것은 아니다. 기존 문서의 Owner 검수 대기와 기존 테스트 실패는 해소됐다고 바꾸지 않았다.

APP는 계약·정책만 읽었다. 이번 작업에서 APP75 코드/브랜치/산출물을 수정하지 않았다. 종료 시 별도 APP 작업이 `efb6b59`까지 진행되어 TASK04C 실기기 검증 파일 등 미추적 변경이 보였으며, 해당 변경도 그대로 보존했다. Claude 브랜치 병합·강제 reset/push 없음.

## 2. 누락의 실제 원인

- 운영 `account_deletion_requests`에 대기3건. 상태 DELETION_PENDING, 단계PERSONAL, retry0/error없음. 요청일11/6·11/8, 예정일은336시간(14일) 이후다.
- `admin_member_list`는 Auth계정 LEFT JOIN 프로필 + 최신 탈퇴 요청을 사용한다. 대기를 기본 제외하지 않고 상태 필터도 있다.
- 기존 관리자 RPC의 실제 읽기 결과: 전체546 / 대기 필터3 / 반환3. 가입일 최신순 위치150·177·263으로 첫 페이지에서 찾기 어려웠다. 조회 당시 값이며 증가하는 회원 수를 고정 상수로 사용하지 않는다.
- 별도 탈퇴 KPI/요청일 정렬 경로가 없고, `admin_student360`·`admin_member_university_activity`가 조회 대상의 `account_private.allowed(subject)`를 검사해 대기 회원의 활동 상세를 거부한다.
- 따라서 목록의 데이터 소실·soft delete가 원인이 아니다. **발견하기 어려운 기본 정렬 + 대상 계정 접근 차단이 관리자 상세에도 적용되는 구조**다.
- 기존 접근 차단은 유지한다. 새 RPC에서 활성 관리자 actor를 검사하고 대기 subject의 필요한 집계만 반환한다. 기존 Student360/회원/RLS는 수정하지 않는다.

## 3. 신규 화면과 계약

기존 `/admin/members/`의 AdminSurface 안에 **전체 회원 / 탈퇴 관리** 탭을 추가했다. 전체 회원은 기존 컴포넌트를 그대로 렌더링한다.

- 네 KPI: 탈퇴 대기, 삭제 처리 중, 처리 오류, 최근30일 삭제 완료.
- 요청 목록: 내부ID·가입일·요청일·삭제예정일·상태·데이터처리·상세. 이메일·닉네임·학교명은 새 화면에서 수집/노출하지 않는다.
- ID 검색, 상태, 최신/오래된 요청순,10개씩 cursor 페이지. 요청시각+ID 보조정렬. 새 요청은 새로고침에 반영; 앞 페이지 삽입/삭제로 offset이 밀리지 않는다. 상태/보관만료는 실시간 기준이어서 만료된 기록을 고정 보존하지 않는다.
- 상세: 기본 최소정보 + 공부/모의고사/논술/학습자료/입시/초대6영역 + 삭제 처리 정보.
- 삭제·취소·예정일변경·재시도실행·복구 버튼 없음.
- 0/기록없음/미집계/권한없음/연결실패/미설치를 구분. API 실패를0으로 대체하지 않는다.
- `NEXT_PUBLIC_ADMIN_WITHDRAWALS_ENABLED=false`로 새 탭만 빌드 시 비활성화할 수 있다.

[client](../src/lib/admin/client.ts)는 기존 세션/RPC 오류 매핑을 사용한다. [계약 파서](../src/lib/admin/withdrawals.ts)는 반환 버전·ID·상태·일시·숫자를 검증하고 삭제/취소 상태의 개인정보를 거부하며 알 수 없는 필드는 전달하지 않는다.

## 4. 집계 정의 / 저장소 재사용

| 지표 | 근거·범위 |
|---|---|
| 대기/진행/오류 | 보관 중 요청. active error가 있으면 오류로 우선 분류하여 중복 KPI 방지. error가 없으면 DELETION_PENDING/ERASING 분리 |
| 최근 완료 | ERASED, completed_at 최근30일, expires_at 미만료 감사 영수증. 전체 탈퇴 누적 수가 아님 |
| 누적 공부시간 | 기존 `student_private.study_summary(...).all_time_ms`. 완료·합산 대상 active_segments의 겹침 제거; 최근30일 값을 누적으로 사용하지 않음 |
| 세션/활동일 | 완료된 합산 대상 study_sessions 수 / KST active_segment 구간의 날짜 DISTINCT, 자정을 넘는 구간 포함 |
| 자동채점 | submitted_at 있는 mock_exam_attempts; 제출수와 DISTINCT content_item_id 시험수 분리; raw_score 기록수 별도 |
| 논술 | essay_exam_private.runs 시험회차 기준 요청/완료/parent 재첨삭. 실패는 완료 제외. 문항 평가수·레거시 단일문항 기록과 합산하지 않음 |
| 이용권 | consume balance_delta만 확정 사용. reserve/release/grant 제외. grant origin purchase / signup_bonus+promotion / 기타로 유료·무료·관리자/기타 분리 |
| 자료 | bookmarks 수, recent_views의 현재 자료 기록 수. 반복 열람 이벤트 횟수는 없어 material_views=NULL → 미집계 |
| 입시 | interested 희망 대학 기록; student_applications 각각의 전형/학과 지원; 정정(supersedes) 제외 accepted/additional_acceptance/rejected 결과가 있는 지원 수 |
| Growth | 기존 invite_tokens/attributions의 유효 귀속; 기존 초대 계약과 동일한 가입 후 합산 대상 공부 기록 여부. 링크 클릭과 구분. 변이를 일으키는 refresh RPC 호출 없음 |
| 마지막 활동 | 위 기록의 실제 시각 중 최신. 로그인/접속 시각으로 추정하지 않음 |

활동 없는 집계0과 시각 기록없음을 구별한다. pending이 아니면 개인별 활동 조회를 생략한다. 삭제가 진행되는 도중의 불완전한 기록도 전체 활동으로 표시하지 않는다.

## 5. 삭제 처리·권한·보존

기존 절차는 신청 →14일 유예/본인접근차단 →PERSONAL/STORAGE/PROVIDER/FINANCE/AUTH/VERIFY →ERASED/DONE이다. 기존 worker·스케줄·유예·삭제대상·복구 정책을 변경하지 않았다.

- 시작 시각 컬럼이 없어 실제 처리 시작은 **미집계**. phase/requested_at/updated_at으로 조작하지 않음.
- phase, retry_count, next_attempt_at, completed/cancelled/expires 시각 읽기. 다음 처리 기준은 worker의 예약 값이며 실제 실행 시각 보장이 아님.
- 오류는7개 기존 코드와 일반 PROCESSING_ERROR만 한국어 매핑. 내부 예외 전문·SQL·인증 정보 제외.
- ERASED는 기존 프로세스가 subject_id를 지우며 완료 감사기록은30일 만료/정리한다. 이미 만료됐으나 purge전인 영수증도 조회 제외.
- 보안: 기존 admin_operator의 authenticated/sub/exp/admin_users 검사 + allowed(actor) 모두 충족. 일반·비로그인·탈퇴대기 회원·탈퇴대기 관리자 차단. 다른 subject ID로 직접 요청해도 actor gate 우회 불가.
- 두 함수만 SECURITY DEFINER/STABLE/empty search_path/8초 timeout. PUBLIC/anon/service_role EXECUTE 회수, authenticated만허용하되 함수 안에서 실제 관리자 검사. 기존 테이블 직접 조회 권한 추가 없음.
- 홈 migration `20261111103058_task04c_home_configuration` 설치 확인. home 읽기/저장·allowed·admin_operator 등 기존7함수 hash는 작업 전후 동일.

### Longitudinal 보존 검토7문항

APP canonical `wiki/longitudinal-learning-admissions-data-strategy.md`, `account-deletion-14-day-implementation.md`, `account-deletion-erasure-retention-boundary.md`, `account-deletion-privacy.md`와 WEB `src/lib/legal-documents.ts`를 참조했다.

1. 사실: 기존 요청/예정/완료/정정 시각을 조회하며 새로운 활동 event는 발생시키지 않는다.
2. 원본: 원본 테이블·원장·예전 회차에서 재계산한다. 원본이 삭제된 후 복원하려는 개인별 snapshot은 만들지 않는다.
3. UPDATE: 조회 전용이며 기존 사용자·상태·정정 event UPDATE 없음.
4. identity: 기존 auth.users 동일ID·credit account 연결 사용; 삭제완료ID는 다시 연결하지 않는다.
5. 영역: 공부/채점은Learning, 희망/지원은Decision, 결과는Outcome으로 분리한다.
6. 권한·retention: 업무상 관리자 최소정보, pending기간만 활동 조회. 기존 개인정보/원장 보관 경계를 따른다. 이번 구현으로 분석 보관기간/동의를 확대하지 않는다.
7. 파생: 시간·횟수는 읽기 파생값이며 원본 사실 테이블로 저장하지 않는다. 자료클릭/처리시작 등 모르는 값은미집계.

### 비식별 통계 검토 — 구현/보관 승인 아님

현존 pending 기록으로 평균 가입기간, 공부/모의/논술 경험 비율, 최근 활동 여부는 계산 가능하다. 최초 활동은 보존된 공부/채점 기록 범위에서만 판단할 수 있고 삭제된 과거 bookmark/view를 포함한 전체 서비스 첫 활동이라고 단정할 수 없다. 완료 후 개인별 복원은 하지 않는다.

장기 월별 집계가 필요하면 삭제 전 허용된 기간에서 식별자 없는 집계를 생성하는 별도 정책 검토가 필요하다. 소수3명의 학교·학년·희귀활동 교차집계는 재식별 위험이 있어 외부/학교보고로 바로 전환하지 않는다. 개인정보 목적·보관기간·최소표본·반복차분 위험을 먼저 승인해야 하며, 이번에는 신규 통계 테이블/식별자 hash 저장을 만들지 않았다.

## 6. 실제 운영 읽기 대조

Supabase 프로젝트 `stlhijzpjfgwwdgunlsd`만조회. pending3 / processing0 / error0 / erased0. 각 대기 subject를 원본 테이블에서 조회하여 후보 집계와 대조했다. 개인별ID/이메일/상세 이력은 Wiki·테스트·증거 파일에 복사하지 않았다.

합계: 북마크1, 최근 열람 자료 기록2, 희망 대학 기록5. 공부·채점·논술회차·이용권사용·실제지원·결과·초대는0. 이것은 클릭 횟수/평생 사용량으로 확장 해석하지 않는다. APP/WEB 기존계정/원장 수정0회.

신규 RPC는 **운영에 존재하지 않음**을 종료 시 재확인했다. 실제 운영에서 신규UI→신규RPC 경로가 통과했다고 보고하지 않는다.

## 7. 검증 결과

| 검사 | 결과 |
|---|---|
| 신규 UI/계약 |35 PASS (탭/기존목록 기본값/비활성화/필터/페이지/상세/빈값/오류/삭제개인정보제한) |
| 격리 PostgreSQL17 | PASS: 합성계정, apply→집계·역할·IDOR·expiry·기존 홈 읽기/저장 차단·모든 원본 테이블 건수+checksum 보존→verify.sql→rollback |
| 시간/집계 fixture | 겹침 제거92분, KST2일, 재응시2/시험1, consume1(예약/복구 제외), 재첨삭, 무료/유료 분리, 지원 정정, 초대 첫공부 |
| cursor fixture | 동시 신규요청/앞페이지 제거 뒤 다음행 유지, 초기cutoff 이후 신규제외, 오래된순 tie 확인 |
| TS / 변경 파일 ESLint | PASS |
| Next production build | PASS (로컬 static export; 배포 아님) |
| 관리자 전체 회귀 |237 PASS /7 FAIL /1 SKIP, 추가 unhandled error1. Claude원본202 PASS /동일7 FAIL /1 SKIP·error1 대비 신규회귀0 |
| 기존 실패 파일 | admin-console.test.tsx 4, admin-analytics.test.tsx 2, dashboard-focus.test.tsx 1. 오래된 UI 기대값·dashboard RPC fixture 및 GA4 focus 기대값; 실제 모든 기존 UX 정상이라는 증거는 아님 |
| boundary 검사 | FAIL: checkout의 TEST 안내 문구. 기존 Claude Wiki에도 같은 실패; 이번 변경에 checkout 코드변경 없음 |
| 시각 검사 | 실제 React 합성화면+기존CSS: desktop1440, mobile390 확인. mobile scrollWidth390=viewport390, 표만 가로스크롤. 브라우저 세션/운영회원 사용 없음 |
| 운영 권한/함수 보존 | 기존7함수 hash동일, home migration1, 후보함수미설치. 운영 데이터는SELECT만 |
| NOT TESTED | 신규 운영 PostgREST/JWT→UI E2E, 운영 개인정보삭제 완료/진행 실상태(해당데이터없음), 고활동회원 부하, 운영 관리자 실사용 모바일, production deploy |

실행:
```sh
node node_modules/vitest/vitest.mjs run src/lib/admin/withdrawals.test.ts src/components/admin/admin-withdrawals-view.test.tsx
bash scripts/withdrawal/run-db-test.sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/app/admin/members/page.tsx src/lib/admin/client.ts src/lib/admin/withdrawals.ts src/lib/admin/withdrawals.test.ts src/components/admin/admin-withdrawals-view.tsx src/components/admin/admin-withdrawals-view.test.tsx src/test/withdrawal-fixtures.ts
node node_modules/vitest/vitest.mjs run src/lib/admin src/components/admin
node scripts/verify-boundaries.mjs
node scripts/copy-pdf-worker.mjs
NODE_ENV=production node node_modules/next/dist/bin/next build
```
Node22사용. 해당checkout node_modules는 Claude와 공유하지 않는 로컬 clone. `.local/task05/`의 검사 로그는 비공개 로컬 증거, 합성 화면은 `/tmp/task05-visual/`이며 저장소/운영에 업로드하지 않았다.

## 8. 변경 파일 / 운영 적용 대기

- [회원 페이지](../src/app/admin/members/page.tsx): 기존권한wrapper 내 workspace연결.
- [신규 화면](../src/components/admin/admin-withdrawals-view.tsx), [스타일](../src/components/admin/withdrawals.css), [UI검사](../src/components/admin/admin-withdrawals-view.test.tsx).
- [기존 client 확장](../src/lib/admin/client.ts), [계약](../src/lib/admin/withdrawals.ts), [계약검사](../src/lib/admin/withdrawals.test.ts), [합성fixture](../src/test/withdrawal-fixtures.ts).
- [후보 SQL·검증·원복·적용안](../supabase/candidates/admin_withdrawal_20261111/README.md).
- [격리 DB 실행기](../scripts/withdrawal/run-db-test.sh), [schemafixture](../scripts/withdrawal/schema-fixture.sql), [SQL검사](../scripts/withdrawal/test.sql).
- Wiki 본문/index/current-status/log/Claude상호링크.

**추가 승인 범위**: 신규 read RPC2개 설치 + 신규 회원관리WEB범위 배포. 데이터 적재/UPDATE/원장/기존권한변경 없음. 승인 전에는 실행하지 않는다. 원복은 새 탭 비활성화/이전 admin artifact 복귀 + 신규2함수 EXECUTE회수/삭제이며 기존 사용자기록·감사 영수증은 그대로 둔다.

## 9. 금요일 Claude 재인수 순서

1. 이 브랜치와 기준 `d4ceb2a`를 비교한다. 원본 Claude checkout과 원격 브랜치는 보존됐다. 아래 Git 기록과 이 문서를 포함한 커밋 이력을 사용한다.
2. [current-status](current-status.md) → [이 문서](admin-withdrawal-management-20261111.md) → [기존 Claude 문서](admin-ux-overhaul-20261109.md) → [SQL 적용안](../supabase/candidates/admin_withdrawal_20261111/README.md) 순서로 읽는다.
3. **배포되지 않았다.** 당일 실제 canonical과 원격 변경을 재확인한다. main 전체를 운영 소스로 대체하지 말고 기존 scoped admin overlay를 계승한다.
4. 기존 테스트 7건과 checkout 경계 실패를 별도 수정하여 공통 검증을 통과시킨다. 이번 작업은 기존 컴포넌트·checkout을 임의 변경하지 않았다.
5. Owner 승인 후 preflight → apply → verify → 관리자 읽기 E2E → WEB 반영을 진행한다. 일반·탈퇴 대기 회원 접근 차단과 홈 설정 읽기·저장 차단을 재검사한다.
6. 운영 대기 3건을 당시 현재 상태와 대조한다. 장기 비식별 통계는 별도 정책 승인 전까지 구현하지 않는다. APP75와 별도 TASK04C 작업은 변경하지 않는다.

개발 인수·누락 원인·UI·후보 SQL·격리 권한 검사는 DONE이다. 공통 회귀 검사 전체 통과와 운영 적용/E2E는 PARTIAL/NOT TESTED이며 운영 완료로 선언하지 않는다.

## 10. 요청한 최종 보고 22항 대조

| 항목 | 결과 / 근거 |
|---|---|
| 1 작업 브랜치 | codex/admin-withdrawal-management-20261111 |
| 2 기준 HEAD | d4ceb2a |
| 3 Claude 인수 | 원본 보존, 코드·Wiki·원격·실제 배포 대조 (§1) |
| 4 운영 기준 | 9788a7ca / source0eefc7d, 신규 배포 없음 |
| 5 기존 개편 상태 | KPI·회원·상태칩·필터·상세 구현 계승; 기존 검수 제한 유지 |
| 6 누락 원인 | 가입일순 발견성 + 기존 상세의 subject 접근 차단 (§2) |
| 7 메뉴 | 기존 회원 내부 2탭, 기존 회원 기본값 |
| 8 목록 | 내부ID·가입/요청/예정·상태·처리·상세, 검색/필터/커서 페이지 |
| 9 KPI | 4종, 오류 우선 분류, 최근30일 감사 기록 기준 |
| 10 활동 | 기존 원본의 6영역 읽기 파생 집계 (§4) |
| 11 처리 현황 | 단계·안전 오류·재시도·예정/완료; 시작 시각 미집계 |
| 12 기존 재사용 | AdminSurface/useAdminQuery/Client·admin_operator·allowed·study_summary |
| 13 후보 SQL | apply/preflight/verify/rollback + README; 운영 미설치 |
| 14 권한 | 격리 관리자/일반/비로그인/탈퇴대기/대기관리자/IDOR/만료 문맥 PASS |
| 15 운영3건 | 기존 회원 RPC와 원본 활동 SELECT 대조, 개별 정보 장기 복사 없음 |
| 16 기존 회귀 | 원본과 같은7 FAIL, 새 회귀0; 기존 전체 PASS로 보고하지 않음 |
| 17 테스트/빌드 | 신규35 PASS, 격리 DB·TS·변경Lint·Next build PASS |
| 18 운영 필요 | 신규 조회 RPC2개 + 회원관리 WEB 범위 배포, Owner 승인 필요 |
| 19 미완료 | 기존 공통 검사 실패 정리, 운영 E2E·고활동 부하·실사용 검수 |
| 20 Git | 구현·SQL·검사·문서 커밋 `1562a0a` (기준d4ceb2a). 후속 문서 커밋은 코드 변경 없음 |
| 21 Wiki | index/current-status/log/Claude 문서 상호 링크 |
| 22 재인수 | §9, 후보 README의 단계별 적용·차단·원복 |

문서 검증: 신규 문서·후보 README의 로컬 링크26개 및 index/current-status/log/Claude 역링크 PASS, current-status 6,940bytes. canonical APP의 `python3 tool/check_wiki_handoff.py`도 읽기 전용 실행하여 PASS(3,072 links, status11,958bytes). APP 파일은 변경하지 않았다.

## Git 검수 기록

구현 커밋: `1562a0a` — `feat(admin): add read-only withdrawal management candidate`. 새 브랜치에만 로컬 커밋했으며 push/Claude 병합/운영 배포는 하지 않았다. 마지막 빌드 후 TypeScript·신규35검사·SQL검증/원복을 순차 확인했다. 이번 후속 문서 커밋은 이 SHA와 인수 상태만 기록한다.
