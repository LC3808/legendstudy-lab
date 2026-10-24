# 2026-10-24 Owner 검수 수정 — 진행 중

이번 범위는 관리자·작성/제출·History·결과·재작성·성장 비교 전체다. 일반 MY 추가 검수는 별도이며 이 작업의 대기 사유가 아니다. 본 문서는 실행 증거/계약 검토이며 Unified Wiki의 대체 Authority가 아니다.

## 데이터 보존 검토 (7문항)
1. 기존 created/submitted/completed 시점을 그대로 사용. 화면 변경을 새 발생 사실로 기록하지 않는다.
2. 원본 답안·문항/시험 ID·평가 pin·Ledger를 수정하지 않는다.
3. 재작성은 기존 parent/run 연결을 사용하며 과거 결과 UPDATE/삭제를 하지 않는다.
4. 동일 auth.users owner 검증 및 기존 관리자 권한·개인정보 경계를 유지한다.
5. 학습 평가/결제 운영 사실과 진학 결과를 혼합하지 않는다.
6. 기존 owner/admin 읽기 계약만 사용하고 신규 수집·외부 전송·bulk PII 조회를 추가하지 않는다.
7. 성장 그래프는 동일 평가 기준의 저장된 단계만 표시한다. 빈 값은 0/긍정 판정으로 바꾸지 않는다.

## 확인된 계약 차이
- 기존 exam reserve는 문항 배열 전체에 1 Credit을 예약하며 free parent는 0이다. 서버에 문항별 예약을 추가하지 않는다.
- WEB ScopedExamSubmit은 선택 탭 하나만 넘기던 상태였다. 작성된 회차 답안을 모으는 변경 진행.
- 실제 Worker 소스 cloudflare_runtime.py는 len(questions)==1 제한을 갖는다. async_exam.py도 다문항 summary 함수를 요구하며 현재 호출에는 없다. 프런트 묶음 변경만 Production 배포하면 안 된다.
- async_exam.py는 한 문항 실패 시 final.failed를 저장하고 회차 finish를 호출한다. 실패 문항만 재처리하려면 checkpoint/lease/terminal/정산 계약을 함께 검토해야 한다. 성공 결과 삭제·새 과금 key로 우회 금지.
- exam 제출 계약은 텍스트만 허용한다. 이미지 Draft는 기존 IndexedDB에 보존하지만 이미지 시험 첨삭과 Math 단독 과금 경로를 회차 계약으로 통합한 상태가 아니다.
- Owner 확정: 최초 미제출 문항은 같은 시험의 새 유료 회차1Credit. 무료 재첨삭은 기존 정확한 문항 집합만 허용.
- 공개12는 인문 Essay11 + 별도 Math1이다. 인문11을 전체12와 비교해 누락1로 해석하지 않는다.

## 운영 조회 계약 확인
로컬 admin-v1은 기간별 전체 Credit 거래/상품별 매출/Registry 집계를 노출하지 않는다. 결제는 query/state/limit/offset, Credit은 account_id/limit/offset이다. 페이지 합계를 전체 통계로 대체하지 않는다.
Owner가 컬럼 목록과 [함수 조회](read-only-functions.sql) 결과를 전달했다. admin_operator JWT·관리자 검증, reserve/finish 1Credit/0Credit·멱등성, history 상세 전용 결과 반환을 확인했다. 기존 관리자 함수는 기간·종류 집계가 없으며 Registry 집계 함수는 조회 결과에 없었다. 추가 읽기 RPC SQL은 admin-report-install.sql, 복구는 admin-report-rollback.sql이다. 기존 함수/테이블/정책 수정 없이 admin_operator 게이트를 재사용한다. 로컬 PostgreSQL 권한·날짜·61건 페이지/전체집계·실결제/테스트 분리·Ledger 종류·학습시간·복구 검증 PASS. Owner 운영 적용 완료: installed/stable/security_definer/operator_gate/authenticated_execute/anon_denied/service_role_denied 모두 true, search_path 빈 값 확인. 실제 관리자 화면 조회 검증은 별도.

## 배포 조건
이 작업의 Production 배포는 아직 하지 않았다. 기준 배포6b69acb3-f497-48e4-8f79-559fc82a7b95 / 코드a21642cf384adc69fa5c6ec6180c3ea7c4987cd2 유지. 통합 완료·검증 전 부분 배포하지 않는다. 복구 기준도 이 배포이며 Secret/Worker/DB 변경 없음.

## 필요한 서버 변경 범위 (운영 미적용)
- 기존 `CloudflareExamRuntime.consume`의 단일 문항 제한을 회차 실행으로 교체. 문항별 Provider/독립검수/평가 프로필은 그대로 재사용하고 새 평가 엔진을 만들지 않는다. 종합 영역은 검수된 문항별 결과를 표시하며 임의의 회차 점수를 생성하지 않는다.
- 기존 DB journal에 문항별 성공/실패를 보존하고 terminal 실패를 새 과금 run으로 바꾸지 않는다. 재처리는 확인된 실패 문항만 별도 재처리 실행 창로 실행하며, unknown은 reconciliation으로 보존한다. 성공 checkpoint는 다시 호출하지 않는다.
- 기존 회차 decision_id를 유지한 재처리 RPC가 필요하다. 과거 failed/released decision을 무조건 재사용하거나 신규 reserve로 우회하면 안 되며, 운영 함수/정산 상태 정의 확인 후 정확한 SQL 및 local PG 동시성 검증을 작성해야 한다.
- Math 단독 leaf 제출과 이미지 입력의 회차 계약 연결도 필요하다. 단순 반복 호출/클라이언트 Credit 보정은 금지한다.
- 미제출 문항은 parent/previous 없는 새 유료 회차로 처리. 기존 성공 데이터 migration/backfill/삭제 없음.

Owner가 회차 실행·재처리 계약에 한해 Worker 조정을 허용했다. 평가 엔진·프로필·Secret은 유지하며 Production SQL은 계속 Owner 직접 실행이다.

## 항목별 현재 상태 (완료 보고 아님)

| Owner 항목 | 로컬 결과 | 남은 검증 / 차단 |
|---|---|---|
| 관리자 KPI·기간 | 운영 KPI 우선 배치, 만료 Credit 하위, 직접 선택 입력 | 기간·공부시간·회차 상태 새 조회 연결 및 Owner SQL 적용 완료. 전체 서버 장애 신호는 미연결, 자료 등록 수와 서비스 활성 수 구분 |
| 회원 관리 | 학교/상태/전공 미설정은 빈칸, 기존 권한/상세 유지 | 운영 화면 검증 |
| Credit 종류×기간 | 기존 지급/회원별 Ledger 조회 보존 | 종류×기간 전체 집계/페이지 RPC 및 화면 구현, Owner 운영 적용·권한 PASS. 실제 로그인 화면 검증 필요 |
| 결제 | 실제 전체 조회가 확보되는 경우 1/3/5/10회권×상태×한국 날짜 기간 및 완료 건수/금액 연결 | 전체 집계/페이지 RPC 연결, 실결제·테스트·통화 분리, Owner 운영 적용·권한 PASS. 기존 개별 주문 상세 조회 유지 |
| 회차 첨삭 | 작성분 수집·부분 확인 모달·빈 답안 차단 | Worker 다문항/실패만 재처리 로컬 구현·검증. 새 서버 계약 capability 확인 전 예약 차단. Worker 운영 배포 전 |
| 답안 저장 | 명시적 저장·기존 text/image Draft 재사용·저장 실패 제출 차단 | 이미지 저장은 브라우저 보관, 이미지 회차 평가 미지원 |
| 중복/재처리·정산 | 기존 idempotency 보존, 실패 후 새 과금 key 버튼 제거 | 실패 문항만 재처리/동일 decision 유지 SQL Owner 적용 완료, 새 Worker/WEB 배포 전 |
| 재첨삭 | 기존 parent/정확한 문항 집합 및 0Credit quote 유지 | 운영 실첨삭 추가 실행하지 않음. 새 문항은 별도 유료 회차로 확정 |
| History/성장 | 회차 기준 그룹, 성장 카드·실제 parent/latest 동일 rubric 그래프, 검색 기본 펼침·초기화 제거 | 과거 Math/legacy 시험 ID 없는 기록은 회차 수에서 제외. 서버 미작성/partial 결과 계약 미완료 |
| 결과 상단 | 시험 정보 카드·중복 제목 제거, known metadata 미작성 문항 표시 | 운영 결과 화면 검증 |
| 음성 | 종합평가 대표 버튼, 반복 세부 버튼·기술 안내 제거 | 기기 음성 기능 회귀검사 PASS |
| 피드백/평가근거 | 잘한 점 중복 제목 제거, 반복 action 정리, 실제 기준/의견 분리·내부 참조 수 제거 | 피드백 없음은 긍정으로 단정하지 않음 |
| 비교/디자인 | 외부 접힘/내부 펼침, 실제 단계 meter 그래프·카드/테두리/여백 | 실제 로그인 화면·모바일 검증 필요 |
| 사용자 용어 | 기존 금지 용어 노출 영역 보존 차단, 문장 수정 예시 노출도 제거 | 전체 운영 화면 최종 검수 필요 |
| 배포/완료 | Typecheck/Lint/Boundary/Production Build 및 관련 검사 수행 | **통합 미완료, Preview/Production 추가 배포 없음. 부분 완료로 종료하지 않음** |

## 검증 증거
- 관련 WEB 검사257 PASS /2 skip + 결제 조합 필터 검사2 PASS = 이전259 PASS /2 skip; 최신 전체 관련261 PASS /2 skip. gateway 보호+제출 모달 검사 포함.
- 실제 PostgreSQL17 임시 DB의 기존 Ledger 계약18 PASS: 동시 중복8요청/원자 정산/무료재첨삭/기존 성공/불명 재확인/원본 함수 보존. 실제 Production DB 검증 또는 다문항 Worker 성공을 뜻하지 않는다.
- 1/2/4문항 UI는 단일 quote/단일 submit payload 검사, 부분 확인 전 submit0·취소 submit0·빈 답안 quote0·무료 quote0. 현재 운영 gateway 다문항 차단이 있으므로 실서비스2/4문항 완료로 보고하지 않는다.
- Production용6개 기존 공개 빌드변수로 static export PASS. Secret 값 변경/저장/출력 없음.
- 로컬 실제 브라우저에서 빌드된 LAB 탐색 화면 확인. 인증·Worker 없는 로컬 환경의 결과/관리자 화면을 검증 완료로 간주하지 않는다.
- APP wiki handoff PASS: current-status11921bytes/1728links. 기존 미커밋 사용자 파일 보존.

## 회차 재처리 후보 검증

`session-retry-install.sql`은 기존 reserve/finish/claim/checkpoint 함수를 교체하지 않는다. private retry_requests에 명시적 실패 재처리 요청을 기록하고 성공 문항 checkpoint는 그대로 재사용한다. 기존 회차·decision·lease token 보존, Credit 추가 예약/정산 없음. 실패 확정만 재시도 가능; pending/unknown/terminal failed·released는 재실행하지 않는다. 새 Provider 실행 창은 별도 retry 요청에만 부여하고 기존 pending writer를 탈취하지 않는다. 최종 전체 성공 시 기존 finish가 한 번 정산한다.

로컬 실제 PostgreSQL: 8개 동시 재처리 요청1generation, 기존 checkpoint/Ledger 불변, 동일 finish 재호출1Credit, owner/worker 권한, unknown 차단, 계정 삭제 cascade/Ledger 보존 PASS. 실제 ReviewedRuntimeWorker + synthetic transport: 4문항 성공/응답 유실 재확인, 성공2+실패1 중 실패1만 재처리, unknown 재호출0 PASS. 운영 실첨삭/Provider 검증을 뜻하지 않는다.

복구: 새 RPC가 호출되기 전 빈 설치는 session-retry-rollback.sql로 제거 가능. 사용 후에는 재처리 기록을 삭제하지 않으며 rollback 파일은 NONEMPTY_RETRY_ROLLBACK_DENIED로 차단한다. WEB 이전 배포 복구는 가능하지만 진행 중 회차가 있는 상태에서 Worker를 과거 단일문항 버전으로 되돌리지 않는다. 먼저 회차 상태를 확인하고 현 실행 계약을 유지해야 한다.

Owner session-retry-verify 결과 확인: table_installed=true. retry/session_claim/session_checkpoint/session_ready는 worker만 허용, session_status는 authenticated만 허용. 5함수 모두 anon/service_role 차단, 빈 search_path. 운영 데이터 읽기·실제 재처리 검증은 별도이며 새 Worker는 미배포.

현재 Production Worker 소스를 내려받아 비교: 평가 엔진·프롬프트 등 유지 모듈은 현재 APP 소스와 byte 일치. 변경 대상은 async_exam.py/cloudflare_runtime.py/db_checkpoint.py와 entry.py의 session capability 확인뿐. 실제 Registry asset은 배포 시 동일 bytes 보존 대상. 로컬 빌드 브라우저의 공개 LAB/대학 탐색 확인; API 없는 static server에서 등록 문항 조회가 안 되므로 인증/작성 화면 PASS로 기록하지 않음.

2026-10-25 회귀 확장: 전체 실행1232 PASS/7 FAIL/4 skip 및 빈 suite1. 새 동의 모달을 반영하지 않은 기존 건국 UI 테스트1건 수정 후 재검사 PASS. 남은 catalog-demand/projection/public-discovery6건과 phase1-browse-snapshot 빈 suite는 이전 실행에서도 확인한 기존 실패다. 관련 범위261 PASS/2skip, 추가 source-selection5 및 round-count/UI journey7 PASS, Worker40 PASS.

2026-10-25 Preview: https://8e9b0f07.legendstudy-lab.pages.dev (WEB b9fd103fdaf743ee4ee1e939a21b1fe6dedc1129). Functions compile/upload PASS, 공개 LAB 브라우저 렌더 확인. 기존 Preview Worker/인증 연결 한계 유지; 운영 첨삭·관리자 화면 검증 완료 아님. Production6b69acb3와 Worker c3fb54be 그대로. APP d258d30d149239f568a453e682a473f3b625eeaf, Unified357e87eb2940a6f9c05649250d10f192683a59fc 원격 확인. Math 현행 계약은 read-only-math-session.sql Owner 결과 대기.

## 2026-10-25 Math 회차 운영 설치 확인

Owner가 현행 정산 함수·canonical 문항 매핑·admission·이미지 저장·소유권 계약을 제공한 뒤 정확한 Math 회차 패키지를 직접 실행했다. [검증 결과와 패키지 SHA256](math-session-owner-verification.json): 공개4RPC 권한/고정 search_path, RLS/테이블, 임시 CREATE 제거, 기존 binding UNIQUE, 설치 정의 일치, 기존 owner/ACL 보존 모두 PASS. [영향·복구·로컬 검증](math-session-candidate/README.md). 기존 성공SQL 재실행 불필요.

WEB 저장 답안→입력 확인→회차 제출 및 기존 Math 단일문항 화면의 회차 연결 구현 중. History는 새 회차에 포함된 attempt의 중복 표시를 제외하고 기존 독립 기록을 유지하며 전체 완료 전 회차 완료 수를 올리지 않는다. 관련 제출/기존화면/집계20검사 PASS. WEB 새 배포·PC/모바일·로그인 검증은 아직 미완료. 운영 학생/Provider 평가를 추가 실행한 결과가 아니다.

보존 검토7: 발생/완료 시점은 서버 사실 사용; 원본 attempt/result 불변; 현재 projection만 추가하고 과거 overwrite/backfill 없음; 동일 auth subject/계정 권한; 학습 결과와 과금 decision/ledger 분리; 자기 계정 조회와 기존 삭제 경계 유지; 회차 완료 수는 저장 상태에서 계산하고 임의 점수/성장 사실 생성 금지.

## 2026-10-25 운영 배포·읽기 검증

WEB source8e3d3c8 → Preview8b267e46 → Production73145355-2b95-481e-b63d-a1ec50d8d304, canonical API 확인. Production public build 설정6개를 그대로 사용했고 Secret 변경 없음. 새 빌드 Typecheck/Lint/Build/Boundary/GitHub audit PASS. 회차 입력/재처리/기존 수리 화면22검사 PASS, MY123PASS/2skip(일부 중복, 합산 금지).

Worker17b3bd65-8d90-4e8e-8ff6-a696e9575588, deployment88c26908-a27b-461e-ba00-dc4175bf3b8c 100%. [파일/배포 근거](session-worker-deployment.json). 기존 실행 파일5개만 변경하고 나머지65파일·Registry·SDK1.9.5·평가 엔진·바인딩 보존. 첫 후보4f9ba4cd는 transport의 새 RPC 허용 누락을 발견해 기존c3fb54be로 복구했다. session ready/claim/checkpoint 3개만 허용하는 회귀를 추가하고42검사 PASS 후 수정 버전을 배포했다. 배포 API 수락과 이후 실제 배포 조회를 구분했으며 최종70파일 해시 일치 확인.

실제 로그인 브라우저: 건국2026자연 문제1의 ‘수리논술 회차 첨삭/저장한 답안 입력 확인0’ 표시, 기존 전체 이력·성장 그래프·기존 수리 결과 상세 정상 조회. 새 제출/Provider/운영 크레딧 거래 실행 없음. 관리자 페이지는 현재 계정 UNAUTHORIZED로 기존 관리자 로그인 요청 중. Mac 잠금으로 기기 도구의 모바일 반응형 검증 불가. 이 두 검증과 전체 잔여 항목을 완료로 보고하지 않는다. 새 MY 재설계 착수 조건은 아직 충족되지 않았다.

운영 복구 기준: WEB 이전a21642c/6b69acb3는 보관. 새 회차 사용 후 Worker를 단일문항 버전으로 되돌리지 않으며 성공 checkpoint/회차/Ledger를 유지하는 forward fix를 우선한다. Math SQL 사용 후 제거는 차단된다.
