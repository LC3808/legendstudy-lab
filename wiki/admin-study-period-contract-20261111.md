# 작업 05-C — 관리자 공부시간 전체 기간 계약 후보

2026-11-11. 기준 `2d7d32d`, 브랜치 `codex/admin-withdrawal-management-20261111`. **후보 구현·관련 격리 검증 PASS / 운영 미적용**. 운영 RPC·WEB·탈퇴 관리 신규 RPC는 적용하지 않았다. 기존 공통 검사에는 별도 실패 6건이 남으므로 전체 관리자 검증 PASS로 보고하지 않는다.

## 원인과 실제 계약

상단 KPI의 ‘전체’는 WEB에서 `{p_from:null,p_to:null}`을 보낸다. 운영 `admin_dashboard_study`는 두 값 모두 유한하고 시작<종료, 간격<=400일인 경우만 허용한다. 따라서 기존 운영에서 PT422/INVALID_PERIOD가 재현된다. 기본 최근30일은 KST 오늘을 포함하는30개 달력일이며, 내일00:00 KST가 제외 경계다.

| 조회 | 기존 전체 기간 지원 | 이번 처리 |
|---|---|---|
| admin_dashboard_study | 없음 | NULL/NULL을 명시적으로 지원하는 후보 SQL |
| admin_member_composition | 있음 | 변경 없음; 전체 가입 코호트, active는 최근30일이라는 기존 의미 유지 |
| admin_learning_analytics | 없음 | SQL 변경 없음; 전체 선택 때 요청하지 않고 해당 KPI ‘기간 선택 필요’ 표시 |
| admin_admissions_analytics | 없음 | 변경 없음 |
| admin_study_by_school | 없음 | 변경 없음; 학교별 기간 조회 회귀·원천 합계 대조만 수행 |
| admin_release_report | NULL endpoint 지원 | 기존 요청·집계 유지 |
| student_school_ranking | `p_period='all'` 지원,1970~조회시각 | 학생 전용 학교·마스킹·표본 계약이므로 관리자 전체 합계 대체로 사용하지 않음 |
| student_private.study_summary | 개인 누적 지원 | 사용자별 DTO·접근 범위라 관리자 전체 합계 대신 N회 호출하거나 합산하지 않음 |

`analyticsWindow` 공통 함수는 계속 전체를 거절하고 <=400일만 반환한다. 모든 관리자 RPC의 계약을 일괄 변경하지 않는다. 상단 KPI의 공부시간/회원 구성에만 NULL 쌍 계약을 사용한다. 현재 공부시간·학습·입시 하단 공통 기간 선택은 기존 bounded-only 정책을 유지한다.

## 최소 수정

[후보 SQL](../supabase/candidates/admin_study_period_20261111/apply.sql)은 기존 공부시간 함수의 **기간 검사 부분만 확장**한다.

- NULL/NULL: 현재 허용된 프로필의 학습 합산 대상 완료 기록 중 실제 최초 시작 시각부터 `statement_timestamp()`까지. 기간 길이의 임의 제한 없음.
- 빈 원천: 시작=종료=조회 시각으로 내부 계산, 실제 빈 집계0. 명시적 같은 시작/종료 입력은 계속 오류.
- 한쪽만 NULL, infinity, 역전/동일한 명시적 경계, 명시적400일 초과: 기존 PT422.
- finite 기간의 집계 본문은 그대로. `study_sessions.active_segments`, 합산 선택, 완료 기록, 현재 허용 계정·현재 학년, 사용자별 range union·기간 잘라내기·고유 기록자 수를 유지한다.
- 가입일/1970/최근365일을 전체 기간의 임의 시작으로 사용하지 않는다. 일시정지·겹침·미동기화 타이머를 더하지 않는다.
- SECURITY DEFINER / STABLE / 빈 search_path / timeout8s / ACL / 함수 인자·반환 타입을 유지한다. 신규 테이블·RLS·권한 변경 없음.

[WEB](../src/components/admin/admin-dashboard-view.tsx)은 지원하지 않는 희망대학 전체 기간 호출과 미완성 날짜 호출을 중지한다. 해당 카드에 ‘기간 선택 필요’를 명시하며 30일 값이나0을 대입하지 않는다. 회원·공부시간·희망대학 RPC 오류는 무한 ‘집계 중’ 대신 조회 실패로 표시한다. 다른 기간으로 돌아오면 기존 조회를 재개한다. 이는 희망대학 전체 기간 집계를 신규 제공하는 변경이 아니다.

## 실제 운영 원천 대조 — 읽기 전용

2026-11-11 21:31 KST, [source-audit.sql](../supabase/candidates/admin_study_period_20261111/source-audit.sql). 신규 함수를 설치하지 않고 SELECT만 실행했다. 사용자 식별자는 출력·보관하지 않았다.

| 범위 | 시작~종료(UTC) | 기록자 | 공부시간(ms) | 학교 입력자(ms) | 학교 미입력자(ms) |
|---|---|---:|---:|---:|---:|
| 전체 | 2026-09-23 04:09:50.518 ~ 2026-11-11 12:31:27.163204 | 28 | 205,102,629 | 181,949,542 | 23,153,087 |
| 최근30일 | 2026-10-12 15:00 ~ 2026-11-11 15:00 | 27 | 205,098,836 | 181,945,749 | 23,153,087 |

- 별도의 이벤트 시작/끝 sweep-line 계산이 각 범위의 range union 합계와 **정확히 일치**했다. 학교15개 및 미입력 합계도 일치했다. 시간 표시로 둘 다56시간58분이지만 원천 차이는3,793ms·기록자1명이다. 반올림된 화면만 비교하지 않았다.
- 현재 실제 전체 기록 범위는400일 미만이다. 기존 RPC에 **실제 최초 시작 시각을 명시한** 읽기 호출은 전체28명/205,102,629ms였고 후보 원천식과 일치했다. 이 방식으로 WEB 전체를 임시 연결하지 않았다. 더 오래된 자료는 격리에서 검증했다.
- 기존 RPC의 같은 KST30일 조회 및 `admin_study_by_school`의 total 모두27명/205,098,836ms. 이는 기존 결과 보존 근거다.
- RPC 읽기는 기존 활성 관리자 DB role/claims 문맥을 읽기 전용 트랜잭션에 설정하고 원복했다. 서명된 JWT·실제 브라우저 인증 E2E가 아니며, 운영 후보 설치 후 검증을 대체하지 않는다.
- 조사 전후6개 함수(공부시간/회원구성/학습종합/관리자학교/학생학교/개인누적)의 정의 해시와 ACL 일치. 탈퇴 관리 신규2함수는 여전히 없음. 운영 사용자·학습·원장 데이터 쓰기0, 운영 migration0, WEB 배포0.

## 격리 및 회귀 결과

[검사 실행기](../scripts/test-admin-study-period.py)는 기존 탈퇴 테스트의 실제 schema/auth 함수 fixture를 재사용하고 임시 Unix socket PostgreSQL17만 사용한다. 운영 URL을 받지 않는다.

- 기존 finite5개 범위 결과(최근30일, KST하루, 자정 직전, 빈 기간, 정확히400일)를 후보와 전후 비교: as_of를 제외한 응답 전체 일치.
- 2020년 기록을 포함하는 전체 기간:3명·18,000,000ms. 최근30일:3명·14,400,000ms. 400일을 넘는 기록 보존 확인.
- 사용자 간 합계, 같은 사용자의 겹친 기기 기록, 일시정지 구간, KST 자정 잘라내기, 학교별+미입력 합계, 빈 원천 PASS.
- 한쪽 NULL/역전/동일/infinity/401일 입력 거절 PASS.
- 관리자 허용 / 일반 회원·탈퇴 대기 관리자·anon·service_role·만료/누락 문맥 차단 PASS. ACL 불변 PASS.
- 기존 다른 함수 정의·학습 원천 행 해시 불변, 정의·ACL 사후 검증 SQL, 정확한 이전 함수 원복 PASS.
- 대시보드 UI6검사 + 기존 탈퇴35검사 = **41 PASS**. null/null 전송, 다른 RPC에 전체 요청 금지, 기간 복귀, 실제0 vs 조회 실패, 미완성 날짜 미호출 검사 포함.
- 기존 탈퇴 격리 DB의 집계/상태/IDOR/만료/페이지네이션/홈 권한/전체 fixture 보존/원복도 재실행 PASS. 탈퇴 구현·후보 SQL은 변경하지 않았다.
- TypeScript·변경 파일 ESLint·Next production build PASS. build는 로컬 검증이며 운영 업로드가 아니다.

기존 관리자 전체 검사는 **243 PASS / 6 FAIL / 1 SKIP, 추가 비동기 오류1**. 기존7FAIL 중 `dashboard-focus`의 오래된 fixture/기대값만 이번 변경 범위에서 보정해 통과했다. 나머지는 이전 보고와 같은 admin-analytics2 / admin-console4 및 같은 mock구조 비동기 오류다. 신규 실패0. checkout 문구 경계 검사1건도 기존과 동일하며 결제 코드는 수정하지 않았다. [05-B 분석](admin-withdrawal-rpc-preflight-20261111.md)을 참조한다.

초기 실행 환경 오류는 제품 실패와 구분한다. 시스템 pnpm이 Node24/자동 의존성 검사로 실행을 중단하여 설치·lock 변경 없이 Node22로 로컬 도구를 직접 실행했다. PostgreSQL 공유 메모리 및 Next/Turbopack 검증은 로컬 프로세스 권한 예외로 완료했다. SQL 후보 작성 중 종결자와 검사 기대 오류문을 보정했으며 최종 검사는 통과했다.

## 운영 적용 제안 및 원복

**이번 작업에서는 실행하지 않는다. Owner의 새 승인 후 순서대로 진행한다.**

1. 실제 운영 source·schema·권한·최신 데이터 확인. 공부시간 정의/ACL drift guard와 탈퇴 후보의 별도 preflight 수행. 정해진 timestamp로 전후 비교 자료 확보.
2. 공부시간 후보1함수 적용 → 정의·ACL·관리자/비관리자/anon API·전체/30일/원천 집계·성능 검증. 기존8초 제한을 유지하고 timeout 발생 시 실패를 표시하며 기간을 줄여 속이지 않는다.
3. 통과 후 탈퇴 관리 신규2조회 RPC 적용 → 현재 대기 계정 및 집계·최소응답·권한·데이터 보존 검증.
4. 통과 후 승인된 WEB 관리자 범위만 배포. 기존 운영 소스의 다른 기능·APP·원장은 보존. 실제 화면·인증 E2E를 별도 기록.
5. 실패 시 이후 단계 중단. WEB은 이전 artifact 복귀, 공부시간은 해시 guard가 있는 [rollback.sql](../supabase/candidates/admin_study_period_20261111/rollback.sql)로 이전 정의 복원. 탈퇴2RPC는 별도 실행권한 회수/원복. 기존 사용자·탈퇴 이력·학습·원장 행은 삭제하지 않는다.

공부시간 baseline MD5 `755d8e824f53a2c82a2cc90cbdf660d1`, 후보 MD5 `2a74d4b3612953760d4ae73403cb3f96`. 다른 관리자 RPC의 전체 기간 지원 확장은 이번 승인 요청 범위에 포함하지 않는다.

## 최종 상태와 파일

1. INVALID_PERIOD 원인: 상단 전체 NULL 쌍과 bounded-only RPC 불일치.
2. 공통 계약: 공부시간만 NULL 쌍 전체, 명시적 범위는 기존400일 제한.
3. 수정: 기존 함수1개 후보 + WEB의 지원 여부/오류 표시.
4. 전체 검증: 원천·독립 계산·유효 finite 기존 RPC 대조 및6년 기록 격리 PASS.
5. 최근30일: 응답 전후 일치, 실제 학교 합계 일치.
6. 권한: 격리 허용/차단 PASS, 운영 실제 세션 후보 검증은 승인 후.
7. 탈퇴35개: PASS, 구현 보존.
8. 기존 실패: 7→6, 신규0, checkout 기존실패 유지.
9. 운영 필요: 공부시간1함수 → 탈퇴2함수 → 검증 → 승인된 WEB.
10. Git: 기준2d7d32d. 이 문서를 포함한 후속 커밋을 후보 HEAD로 사용한다.
11. Wiki: 본문/index/current-status/log와 후보 README 연결. 운영 완료로 기록하지 않는다.

주요 파일: [WEB](../src/components/admin/admin-dashboard-view.tsx), [UI검사](../src/components/admin/dashboard-focus.test.tsx), [DB검사](../scripts/test-admin-study-period.py), [SQL·사전/사후 검사·원복](../supabase/candidates/admin_study_period_20261111/README.md).

권한 설계 검토에는 [Supabase 함수 문서](https://supabase.com/docs/guides/database/functions)를 참고했다. 실제 판단 근거는 위 운영 함수 정의와 격리 실행 결과다.
