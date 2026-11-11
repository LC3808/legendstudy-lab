# 작업 05-B — 운영 조회 RPC 사전 검사 / 적용 중단

2026-11-11 21:14 KST. 판정 **BLOCKED (사전 검사 단계)**. Owner의 신규 관리자 조회 RPC 2개 적용 승인을 확인했다. 다만 지시 3-C의 관리자 API 경계 영향 발견 시 중단 조건에 따라 **운영 SQL 적용 0건 / Migration 적용 0건 / WEB 배포 0건**이다. 승인 부족으로 멈춘 것이 아니다.

기준 브랜치 `codex/admin-withdrawal-management-20261111`, 검사 HEAD `a16c95f`, 구현 `1562a0a`. 이 보고서 변경은 문서뿐이며 후보 SQL·제품 코드를 수정하지 않는다. [기존 구현 보고](admin-withdrawal-management-20261111.md), [적용·검증·원복 후보](../supabase/candidates/admin_withdrawal_20261111/README.md).

## 1. 중단 근거: 기존 대시보드 전체 기간 계약

- [대시보드](../src/components/admin/admin-dashboard-view.tsx)의 `kpiRange`는 ‘전체 기간’일 때 `{p_from:null,p_to:null}`을 만들고 기존 `admin_dashboard_study`를 호출한다. 기본값은 최근 30일이므로 모든 대시보드 조회가 실패한다는 뜻은 아니다.
- 앞선 배포 확인에서 기록한 운영 source `0eefc7d`에도 동일한 호출이 있다. 이번에는 해당 Git 소스를 다시 대조했으며 Cloudflare 배포 포인터 자체를 재조회하거나 변경하지 않았다.
- 운영 DB 함수는 NULL 시작·종료 시각을 거절한다. 실제 활성 관리자 문맥의 읽기 전용 트랜잭션에서 `admin_dashboard_study(NULL,NULL)` → **`PT422 / INVALID_PERIOD`** 재현. 같은 문맥의 최근 30일 조회는 정상이며 `total.ms`, `total.users` 키가 존재한다.
- 이 결함은 신규 탈퇴 RPC가 만든 것이 아니다. 권한 우회·개인정보 노출도 확인되지 않았다. 하지만 실제 기존 관리자 **UI→RPC 입력 계약 불일치**이므로 Owner가 지정한 C(API 경계 영향)에 포함하여 적용을 중단했다. 아래 7개 테스트 실패가 모두 보안 결함이라는 의미는 아니다.
- 운영 함수·기존 WEB 수정은 이번 승인 범위 밖이다. 이를 임의 수정하거나 전체 기간을 최근 30일로 위장하지 않았다.

DB 검증은 `BEGIN READ ONLY` 안에서 기존 활성 관리자 ID를 서버 내부에서 선택하고 JWT **문맥 설정** 및 `SET LOCAL ROLE authenticated`로 기존 함수를 실행한 후 `ROLLBACK`했다. 서명된 JWT를 만들거나 로그인하지 않았다. 따라서 DB 권한 문맥 검사이며 실제 브라우저/PostgREST 로그인 E2E PASS로 간주하지 않는다. 계정 ID·이메일·토큰을 보고서에 저장하지 않았다.

## 2. 기존 7개 실패: A/B/C 분류

원본 Claude checkout `643f68e`와 인수 기준 `d4ceb2a`의 차이는 roadmap Wiki 1개뿐이다. 제품 코드가 동일한 원본에서 기존 관리자 검사를 실행하고 현재 HEAD와 비교했다.

| 검사 | 원본 기준 | 현재 후보 |
|---|---:|---:|
| 관리자 테스트 | 202 PASS / 7 FAIL / 1 SKIP | 237 PASS / 7 FAIL / 1 SKIP |
| 추가 비동기 오류 | 1 | 동일 1 |
| 신규 탈퇴 UI·계약 검사 | 없음 | 35 PASS |
| 경계 검사 | checkout 문구 1건 FAIL | 동일 1건 FAIL |

| 실패 | 분류 | 확인한 원인·범위 |
|---|---|---|
| admin-analytics: missing RPC/quality routes | A | 기본 통합 화면에서 GA4 문구를 기대하지만 현재 GA4 전용 화면과 기대값이 다름 |
| admin-analytics: logout | A | 로그아웃 실행 전 GA4 문구 대기에서 실패. 이 실패만으로 로그아웃 정보 잔존을 입증하지 않음 |
| admin-console: dashboard metrics | A | 기존 fixture가 공부시간 RPC에도 다른 구조를 반환하여 `total.ms` 접근 오류. 비동기 오류도 동일 원인 |
| admin-console: bounded member directory | A | 개편 전 순번 열·문구 기대값이 남음 |
| admin-console: member pagination | A | 제거된 순번 표시를 기대함. 서버 offset 검사와 구분 필요 |
| admin-console: member detail | A | 개편 전 ‘학습 정보’ 제목을 기대함 |
| dashboard-focus | A | 공용 mock이 모든 조회에 같은 응답을 반환하여 신규 release 데이터 구조와 불일치 |
| verify-boundaries | A | `payment-checkout.tsx`의 ‘테스트 결제 환경’ 고객 노출 문구 금지 규칙. 관리자 권한/API 보호 실패가 아님 |
| 추가 운영 API 계약 검사 | C | 전체 기간 NULL 요청이 운영 공부시간 RPC에서 PT422. 위 7건과 별도로 확인한 실제 계약 결함 |

**새로운 테스트 실패 B는 0건**이다. 기존 전체 검사가 PASS라는 뜻은 아니다. 기존 AdminGate의 비로그인/비관리자 차단 및 관리자 허용 검사, 계정 변경 시 private 화면 unmount 검사는 통과했다. 로그아웃 실패 fixture는 별도 보정 후 다시 확인해야 한다.

재현 명령: 원본과 후보에서 `pnpm exec vitest run src/components/admin src/lib/admin --reporter=dot`, `pnpm verify:boundaries`. 후보에서 `bash scripts/withdrawal/run-db-test.sh`. 실행 로그는 후보의 ignored `.local/task05b/`, 원본 비교 로그는 `/tmp/task05b-baseline-tests.log`, `/tmp/task05b-baseline-boundaries.log`에 있다. 임시 로그가 사라져도 본문 명령과 원인으로 재검사할 수 있다.

## 3. 운영 사전 검사 및 보존 대조

대상 프로젝트 `stlhijzpjfgwwdgunlsd`. [preflight.sql](../supabase/candidates/admin_withdrawal_20261111/preflight.sql) 실행 PASS: 신규 이름 충돌 0, 의존 migration 존재, 기존 7개 함수 정의 해시 일치. 최종 조회에도 신규 함수 설치 수 **0**.

검사 전후 다음 범위가 동일했다.

| 대상 | 결과 |
|---|---|
| public/account_private/student_private/essay_exam_private 기존 함수 286개 | 이름·인자·정의 해시·ACL·소유자 동일 |
| 위 스키마 및 auth 테이블 127개 | RLS/강제 RLS·ACL·소유자 동일 |
| 해당 범위 RLS 정책 120개 | 정의·대상 role·조건 동일 |
| 관리자 allowlist | ID 집합 해시 동일 |
| 계정 550개 | ID·생성일·삭제일·차단만료 집합 해시 동일 |
| 탈퇴 요청 3개 | 전체 요청 행 집합 해시 동일 |
| 기존 회원 목록 RPC | 관리자 DB 문맥에서 탈퇴 대기 필터 3건 / 항목 3건 |
| 기존 공부시간 RPC | 최근 30일 PASS / 전체 기간 FAIL |

기존 7개 의존 함수: `admin_operator`, `account_private.allowed`, `admin_student360`, `admin_member_list`, `my_home_configuration`, `student_private.study_summary`, `save_my_home_configuration`. 읽기·문맥 설정 외 운영 변경 명령을 실행하지 않았다. 평가·학습·이용권·결제 데이터의 전체 행 해시 비교까지 수행한 것은 아니며, 이를 전수 검증 PASS로 확대하지 않는다.

보안 Advisor 사전 결과: INFO RLS enabled/no policy 56, WARN public extension 1, anonymous SECURITY DEFINER execute 9, authenticated SECURITY DEFINER execute 153, leaked-password protection 1. 기존 권고이며 이번에 변경하지 않았다. 신규 함수 미설치이므로 신규 Advisor 변화 검증 단계에 도달하지 않았다.

## 4. 신규 RPC 후보 검토 / 운영 미실행 구분

| 항목 | 후보·격리 검증 | 운영 검증 |
|---|---|---|
| `admin_withdrawal_list(text,text,text,integer,integer,jsonb) → jsonb` | PASS | NOT INSTALLED |
| `admin_withdrawal_detail(uuid) → jsonb` | PASS | NOT INSTALLED |
| STABLE / SECURITY DEFINER / 빈 search_path / timeout 8초 | SQL·격리 PASS | NOT TESTED |
| authenticated EXECUTE + `admin_operator()` 및 `allowed(auth.uid())` 검사 | 격리 PASS | NOT TESTED |
| anon/service_role 실행권한 제외, 일반/탈퇴대기/비활성 관리자 거절 | 격리 PASS | NOT TESTED |
| 삭제·수정·계정 상태 변경 없는 조회 | 후보 검토 PASS | 적용 없음 |
| 상태별 최소 응답·활동 집계·만료·IDOR·페이지 커서 | 합성 자료 격리 PASS | 신규 RPC로 실계정 3건 상세 NOT TESTED |
| 원복 | 격리에서 신규 2함수 제거 및 기존 자료 보존 PASS | 실행 불필요 / 미실행 |

이번 재실행은 fixture aggregate, lifecycle, privilege matrix, IDOR, expiry, home gate, all-table preservation, cursor mutation, missing/expired context 검사 및 원복까지 완료했다. 격리 결과를 운영 로그인 세션 검증으로 바꾸어 기록하지 않는다. 이전 작업의 원본 활동 SELECT 대조는 [기존 보고](admin-withdrawal-management-20261111.md)에 있으며, 이번 신규 RPC 적용 후 집계 검증을 대신하지 않는다.

## 5. 재개 순서 / 원복 / WEB 승인

1. 기존 API 계약의 해결 범위를 먼저 확정한다. 최소안은 공부시간 조회에 지원 가능한 기간만 전달하고 ‘전체 기간’ 선택에서 제한을 명확히 표시하는 WEB 수정이다. 실제 전체 기간을 지원하려면 별도 RPC 설계·성능 검증·운영 승인이 필요하다. 이번에는 어느 쪽도 구현하지 않았다.
2. 기존 테스트 fixture·화면 기대값 및 checkout 문구 검사를 각각 실제 정책과 맞춰 정리한다. 권한 거부 규칙을 약화해서 검사를 통과시키지 않는다.
3. C 항목 해소 후 같은 승인 범위 내 신규 RPC 2개에 대해 최신 schema/ACL/RLS/데이터 사전 검사를 다시 한다. 이번의 조건부 SQL 승인은 기록되어 있으며 동일 승인을 무조건 재요청할 이유는 없다. 범위가 달라질 때만 추가 승인이 필요하다.
4. 통과 후 migration 생성·적용 → 신규 RPC 설치/권한 검사 → 실제 관리자/비관리자/비로그인 요청 및 실계정 3건 집계 대조 → 보존·Advisor 비교. 현재 **migration 생성·적용 모두 없음**.
5. 운영 RPC 검증 완료 후에만 WEB 배포 승인을 요청한다. 현재는 API 결함이 남고 신규 RPC도 미설치이므로 WEB 공개 승인을 요청할 단계가 아니다.

원복 후보 [rollback.sql](../supabase/candidates/admin_withdrawal_20261111/rollback.sql)은 신규 두 함수만 대상으로 한다. 긴급 차단은 두 함수의 authenticated 실행권한 회수이며, 사용자·탈퇴 이력·원장 삭제나 CASCADE는 없다. 운영 적용이 없으므로 지금 원복할 변경도 없다.

## 6. Owner 요청 14항 결과

1. 적용 전 상태: 신규 RPC 없음, 기존 메타데이터/권한 사전 검사 완료.
2. 기존 7실패: 모두 기준에서도 재현(A), 신규 실패(B) 없음.
3. 경계 실패: checkout 문구 기존 실패. 별도 실제 API 계약 C 발견으로 중단.
4. 적용 RPC 2개: **0개 적용**, 후보 유지.
5. 적용 Migration: **없음**.
6. 관리자 권한: 기존 RPC DB 문맥 PASS, 신규는 격리만 PASS.
7. 비관리자/비로그인: 신규 격리 PASS, 운영 신규 미검증.
8. 대기 계정: 기존 회원 목록 RPC에서 3건 확인.
9. 활동 집계: 신규 합성 격리 PASS, 운영 신규 상세 미검증.
10. 기존 RPC/RLS: 지정 범위 전후 동일.
11. 데이터 보존: 계정 상태/탈퇴 요청 해시 동일, 운영 쓰기 없음; 전체 원장 전수 비교는 미실시.
12. 원복: 준비·격리 PASS, 운영 미실행.
13. Git/Wiki: 이 보고서와 index/current-status/log, 후보 안내 갱신. 제품 코드는 `1562a0a` 유지.
14. WEB 배포: **보류**. RPC 검증 완료 후 별도 승인 요청 예정.
