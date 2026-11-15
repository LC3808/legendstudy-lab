# 논술 LAB 독립 운영 대시보드

2026-11-15. Owner 승인: 독립 `/admin/lab-dashboard`, 신규 읽기 집계 RPC 1종, 검증 후 운영 배포. 기준 운영 `465ae26c`, WEB `82a08d5`, 문서 HEAD `3476d7d`. Claude 설계 `e19f086`의 `wiki/essay-lab-dashboard-design-20261115.md`를 교차 확인했다. 기존 [7개 IA](admin-essay-operations-ia-20261114.md), [PHASE3](admin-console-phase3-20261114.md), [PHASE4](admin-console-phase4-20261115.md), [P0 데이터 계약](admin-lab-operations-20261114.md)은 그대로 재사용한다.

## 구현과 계약

- 운영 대시보드 그룹 두 번째에 논술 LAB 대시보드 추가. 기존 7그룹/25메뉴/URL/관리자 가드 유지. 일반 대시보드 운영 상태 요약에서 허브 링크 제공.
- KPI 6개: 고유 학생, 요청, 완료, 실패, 현재 처리 중, 완료 평균 시간. KST 오늘/7일(기본)/30일/전체. 완료·실패는 접수 기간 코호트의 현재 상태. 현재 처리 중은 기간·출처와 무관한 예약 상태.
- 기존 `admin_lab_runs_filtered` 첫 페이지 25개 중 최신 10개만 표시. 전체 답안/결과/상세 조회 없음. 상세 링크는 회차 UUID, 대학 링크는 대학 UUID와 출처·기간을 유지.
- 신규 `admin_lab_dashboard_summary`만 생성. 기존 runs/account/exam/university/billing/credit transaction/beta grant 식별자 재사용. 베타는 부모 과금 결정까지 기존 계약대로 추적; EXISTS로 중복 원장 연결 시 증폭 방지. 학생 DISTINCT, 대학별 요청 내림차순→대학명 C→ID. 대학별 학생 수는 합산하면 안 됨.
- 기존 operations 평균은 모든 상태 duration 필드여서 요구한 완료 시간과 다름. 같은 승인된 신규 RPC에서 완료이면서 유효 시각인 회차의 `completed_at-created_at` 평균/표본 수를 추가. 빈 평균은 null/기록 없음. 실제 시각 없는 회차를 0초로 채우지 않음.
- 기존 PHASE4 운영 상태 카드 presenter 분리 재사용. 고정 최근7일 실패/현재 처리/현재 재시도/신규 피드백. 중복 가능 수치 합산 안 함. 기본7일은 KPI·카드·비용이 operations 한 호출 공유. 피드백 new 조회도 공유.
- 품질은 `is_quality_operator` 확인 뒤 사용자 요청 시 기존 `ql_exam_cases` 조회. 일반 관리자에게 자동 권한 부여 없음. 문항 모집단/검토 이력 보유 수를 표시하며 임의 검수 대기 수 계산 안 함. 최근 사례는 **최근 요청 50문항 내 검토 이력 보유 최대5건**이며 전체 검수일순 목록이 아님. 전체기간은 계약 미지원으로 안내.
- 피드백 new/reviewing 정확한 상태 필터 재사용. 숫자 만족도 계약이 없어 평균 생성 안 함.
- 이용권·매출은 클릭 후 기존 `admin_release_report` 집계 조회. 지급/사용은 공용 원장, WEB 결제는 PAID/paid_at/mode/통화 구분. LAB 전용 매출이나 이익으로 해석하지 않음. 취소·부분취소는 주문 생성 기간+현재 상태이며 **실제 환불액/환불일 집계 아님**.
- 비용은 기존 operations model 차원만 표시하여 day/university 등 중복 소계 합산 방지. UNKNOWN은 확인 불가. 전체기간은 operations 최대93일 계약 때문에 지원하지 않음. 기존 비용 상세 링크 제공.
- 독립 병렬 읽기 및 영역별 오류·재시도. 품질/재무 상세 집계는 요청 시 로드. 신규 테이블/인덱스/자동 재처리/데이터 보정 없음.

## SQL·권한·성능·보존 검증

후보: `supabase/candidates/lab_dashboard_20261115/{apply,postcheck,rollback}.sql`, `query.sql`, `test_isolated.py`.

- 격리 PostgreSQL: 반복 학생 DISTINCT, 대학 집계, KST 경계, 무료 자식·베타 상속, 중복 거래, source beta/other, 빈 구간, 완료 평균, 잘못된 구간, 관리자/비관리자/anon/service/restricted, 원복·재적용·원본 해시 PASS.
- 운영 실제 body EXPLAIN ANALYZE: 7일 0.832ms (planning3.391ms), 전체 1.634ms (planning3.490ms). 임시 블록 read/write 모두0. 현재58회차; 작은 순차 스캔은 적정하며 인덱스/메모리 상향 없음. 대규모 부하 테스트는 NOT TESTED.
- 운영 migration `admin_lab_dashboard_summary` 성공. SECURITY DEFINER postgres, search_path empty, timeout5s, 기존 require_admin() 호출. PUBLIC/anon/service_role 실행 회수, authenticated만 실행 가능하며 내부 관리자 검사 필수.
- 운영 관리자 JWT 조회 PASS. 실제 비관리자 authenticated 호출 42501 차단 PASS. anon/service 실행 권한 false. 정적 HTML shell은 기존 방식이고 민감 집계는 서버 RPC에서 차단.
- 보안 advisor: 기존 항목 그대로, authenticated SECURITY DEFINER 실행 점검 164→165만 증가. 새 함수의 실행 허용 자체에 대한 점검이며 관리자 내부 검증을 실제 확인. 기존 anon9/RLS58/extension1/auth-password1 지적은 이번 범위에서 수정하지 않음.
- 적용 직전/직후 원본 해시 일치: runs `43c7f43db580515a97939780758c2512`, ledger `3c57afd53b16a8fa85ffc9271d55953e`, payments `f23daf39e1cb561852949c77e3798d92`, quality judgment 없음(null). 답안·평가를 포함한 runs 전체 행 해시 확인. 사용자 프로필 수정 없음.
- 운영 전체: 고유5명,58요청,47완료 평균 표본,평균1094.716548초,13대학. 성균관대7요청/3명/7완료/무료3/베타1. 시점 스냅샷이며 이후 새 요청에 따라 변함.
- 원복은 신규 함수 body MD5 확인 후 해당 함수만 DROP. 기존 기록 미변경. WEB 원복은 기존 배포465ae26c로 되돌릴 수 있음; RPC 먼저 제거하면 새 화면 해당 영역 오류가 나므로 WEB부터 원복.

## 자동화 검증

- 집중 40 PASS: 신규 집계 UI/기간/링크/부분 실패/UNKNOWN, 기존 카드/메뉴/기간/첨삭 목록·상세·미리보기 회귀.
- TypeScript, 변경 파일 ESLint PASS. 프로덕션 빌드 PASS. 품질 권한 통과 후 명시적 로드/사례 링크 추가 테스트 PASS (해당 파일6개).
- 전체 2,018 PASS /11 FAIL /1 ERROR /5 SKIP. 추가 품질 지연조회 테스트1개는 별도 PASS. 기준 PHASE4 2,011 PASS의 기존 실패와 동일한7파일: catalog-demand-projection, catalog-demand, public-discovery, university-theme, materials, admin-analytics, admin-console. 신규 실패 없음. Boundary audit는 기존 checkout TEST 문구 지적으로 FAIL이며 변경 파일과 무관. 기존 데이터 기대값/누락 mock 문제는 [PHASE4](admin-console-phase4-20261115.md) 분류 참조. 기존 실패를 숨기거나 무관한 코드를 변경하지 않음.

## 운영 배포·브라우저 검증

진행 중. 배포 및 실제 브라우저 확인 후 결과를 갱신한다. 이 시점 브라우저 검증은 NOT TESTED.

## 명시적 후속 범위

실제 환불액/환불시각 집계, 전체기간 비용·품질, 전체 검수일순 최신 사례, 만족도 평균, 장기미완료·결과누락·차감이상 통합 집계는 기존 계약 미지원 또는 별도 승인 범위로 PARTIAL. 실제 학생 제출/차감/결제/검수 저장은 이번 읽기 허브 검증에서 NOT TESTED. 기존 엔진·결제 정책 변경, 스토어 제출 없음.
