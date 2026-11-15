# LIVE 결제 PAUSED 유지 · 단일 Owner QA 사전 검증

2026-11-15. 운영 SQL 미적용, 결제 활성화/실제 결제/환불/스토어 제출 0. 코드 운영 배포 및 읽기 진단 결과는 마지막 영수증에 기록한다. SQL은 검토 후보로 유지한다.

## 확인된 서버 상태

- Cloudflare 운영 deployment: `9105e9e8-3606-472d-976e-2b2ab493438e`. LIVE 설정, PAYMENT_ENABLED=false(PAUSED) 확인.
- Finance/LIVE Client/LIVE Secret binding 존재·secret_text 형식만 확인. Secret 값 출력/파일 저장 없음. 프로젝트 응답 전체 저장은 자동 승인 검토에서 거부되어 메모리 내 메타데이터 검사로 대체했다.
- 로컬 예전 Finance JWT는 만료됐으나 배포된 토큰과 동일하다는 근거는 없다. 배포 토큰 유효성, 키 쌍/MID, 현재 Pages→Toss 접근정책은 NOT TESTED.
- 운영 payment_order는 authenticated 직접 실행 가능. 따라서 Worker만 제한하면 주문 생성 우회가 남는다. payment_process는 finance 역할만 실행 가능.
- 읽기 진단의 all-zero 주문 ID가 운영에 없음을 SELECT 확인. 기존 payment_process get은 없는 ID에서 쓰기 전 PT404. 고정 과거 실패 주문에 대한 Toss GET만 사용하며 confirm/cancel을 호출하지 않는다.
- LIVE 주문 FAILED1/NONE1, LIVE 지급0. 과거 INVALID_UNREGISTERED_SUBMALL은 현재 재현하지 않았다.

## 구현 범위

고정 Owner UID `d5eab102-da92-4c4c-9adb-16d2c9d20e4c` 한 개만 LIVE QA 후보. 관리자 역할/이메일/다중 UID로 확장하지 않는다. 고정 reviewer `ddc5ae63-acbb-490b-a423-c996b811dea8`는 TEST 전용이며 과거 LIVE 주문도 신규 confirm_begin 전 차단한다.

LIVE QA는 PAYMENT_ENABLED와 별도로 `PAYMENT_QA_ONLY=true`, 정확한 단일 OWNER PAYMENT_QA_SUBJECTS, 미래 PAYMENT_QA_UNTIL을 모두 요구한다. 누락/false/잘못된 설정은 차단. 1c/4900원만 신규 승인 후보. 기존 승인 완료 복구와 조회 계약은 보존한다. 결제창 UI도 consumer_purchase=false이면 비활성화한다.

진단 endpoint는 고정 Owner의 fresh Auth만 허용하고 PAUSED에서만 작동한다. 결과는 상태 코드·허용 오류 코드·일치 여부만 반환한다. Finance 및 Toss Secret, 토큰, 결제키, 응답 본문은 반환하지 않는다. **이후 Owner의 PAUSED 코드 배포 승인으로 운영 배포·읽기 진단을 수행했다. 최신 결과는 마지막 영수증 참조.**

## Owner에게 보고하는 정확한 SQL 후보

- [apply.sql](candidates/payment-qa-20261115/apply.sql): configuration에 purchase_enabled(default false), qa_started_at, qa_until 세 컬럼 추가. payment_order create의 LIVE 분기에 PAUSED·고정 Owner·1c·기한·QA 기간 사용자별 주문1개 제한. 같은 request_key 재호출은 멱등. 기존 get/TEST/가격/권한 유지. 함수 정의 MD5 불일치면 전체 중단.
- [postcheck.sql](candidates/payment-qa-20261115/postcheck.sql): 설정과 상태별 주문 수 확인.
- [rollback.sql](candidates/payment-qa-20261115/rollback.sql): 원본 함수 복원 및 새 컬럼 제거. 사용자 주문·이용권·결제 이력 DML 없음. 원복은 직접 주문 RPC 차단도 제거하므로 운영 PAUSED 상태를 유지하고 접근 영향을 재검토해야 한다.
- [local-fixture.sql](candidates/payment-qa-20261115/local-fixture.sql), [local-check.sql](candidates/payment-qa-20261115/local-check.sql)은 **폐기 가능한 로컬 DB 전용**. 운영 실행 금지.

격리 PostgreSQL에서 최종 후보 적용→PAUSED 차단→Owner 1c 생성→동일 키 재시도→두 번째 주문 차단→만료 차단→비Owner 차단→get 유지→원복 PASS. 초기 문법/변수 충돌을 이 단계에서 수정했고 운영에 적용하지 않았다.

활성화는 별도 Owner 승인 필요: QA 기한과 시작 시각 확정, 위 SQL 적용·사후 확인, 서버 읽기 진단 통과 후에만 DB purchase_enabled와 Worker PAYMENT_ENABLED를 제한 창 동안 활성화하는 정확한 값을 다시 보고한다. 지금은 둘 다 활성화하지 않는다. 실제 결제는 Owner만 수행하며 환불은 별도 승인이다.

## 검증 상태

최초 WEB 2068 PASS/5 SKIP, 정적 검사 PASS, webpack 정적 빌드 PASS. Turbopack은 외부 node_modules 링크 환경 오류로 실패했으며 webpack으로 통과했다. 단일 Owner 최종 정책 반영 후 WEB 2070 PASS/5 SKIP/0 FAIL, TypeScript·변경 파일 ESLint·webpack 빌드 PASS. 익명 LIVE 구매가 가능하다는 기존 UI 기대값은 최신 차단 정책으로 갱신했다. 실결제/실환불/운영 진단/직접 운영 RPC 차단 확인은 NOT TESTED.

## 최종 사전 차단 보완 및 Owner SQL 결정

Owner는 2026-11-15 “변경안 검토까지, 운영 적용 보류”를 선택했다. 운영 SQL 미적용 유지. postcheck에 default false, SECURITY DEFINER/search_path/ACL, authenticated·anon·finance EXECUTE, 단일 Owner 제한, 정확한 후보 함수 MD5 `8a156d337ed6c3b30b0c2e2d308d6d7c` 검증을 추가했다. 격리 적용·원복으로 지문 확인.

신규 LIVE confirm은 fresh Owner, PAUSED, QA 설정·기한·상품을 confirm_begin 전에 검사한다. 기존 AUTHORIZATION_PENDING/PAID는 저장된 Finance get으로 복구하며 caller payment key를 새 승인에 사용하지 않는다. Provider IN_PROGRESS는 기존 추가 차단을 유지하고 DONE은 재승인 없이 복구한다. 이 경로 분리는 합성 transport 테스트 PASS.

Owner 전용 PAUSED 읽기 진단 UI를 관리자 결제 화면에 추가했다. 서버도 fresh Owner를 재검증하며 raw 응답/Secret을 반환하지 않는다. WEB 전체2078 PASS/5 SKIP/0 FAIL, 정적검사/webpack 빌드 PASS. 운영 공개 클라이언트 설정 누락을 배포 계획 검사가 발견해 현재 NEXT_PUBLIC plain-text 설정만 메모리 전달하여 다시 빌드했다. 결제3경로·관련 API 외 기존 static/환경 설정 보존 계획 PASS. 배포 후 결과는 아래 별도 영수증으로 기록한다.

## 운영 배포 보류 영수증

구현 SHA `ca56582`는 작업 브랜치 Commit·Push 완료. Cloudflare `--apply` 실행 요청은 자동 승인 검토에서 **실행 전 거부**됐다: 구현·검증 허용과 별도로 정확한 운영 배포의 명시 승인이 필요하다는 사유. 우회하지 않았으며 Owner에게 PAUSED·환경 설정·SQL을 유지하는 코드 배포 승인만 요청했다. 새 배포 ID 없음. 운영 기준은 계속 `9105e9e8-3606-472d-976e-2b2ab493438e`; 신규 읽기 진단의 운영 실행은 NOT TESTED.

구분: 구현/합성 테스트/운영 공개 설정 빌드/배포 계획 DONE; 운영 코드 배포 BLOCKED(승인 대기); SQL HOLD(Owner 명시 보류); Finance 유효성·MID·Pages→Toss 실제 읽기 진단 NOT TESTED; 실제 결제/환불0; PAUSED 해제0.


## Owner 승인 후 운영 배포 · 읽기 진단 영수증 (22:31 KST)

Owner가 “PAUSED 유지 코드 배포 승인”으로 위 차단을 해소했다. 제품 변경 `ca56582`, 배포 Git metadata `49e08ee4dd03d47a7f61205ee9ebc64d3618b8d0`. Cloudflare 운영 배포 **`c6dcd96a-8ac1-4d32-8dbe-97959286969d`** success 및 canonical 승격 확인. 배포 완료 시각 2026-11-15 22:29:04 KST.

- DONE: LIVE/PAYMENT_ENABLED=false 유지. 이전·새 배포 환경 메타데이터 동일, 함수 라우팅 동일, 비결제 정적 경로 2,934개 hash 보존. Secret 값은 출력/저장하지 않았고 환경 설정 PATCH도 하지 않았다.
- DONE: 운영 관리자 `/admin/payment/`에서 Owner 전용 읽기 진단 버튼 표시·실행 확인. 기존 결제 조회와 “신규 결제 일시 중지” 표시 유지.
- PARTIAL: Finance 읽기 진단은 **HTTP 401 / PGRST303**, 읽기 권한 미확인. 실제 배포 인증 경로 실패를 확인했으나 정확한 토큰 거부 원인까지 분리하지 못했다. 로컬 과거 JWT 만료와 동일 원인이라고 단정하지 않는다. Finance 자격 증명 점검·수정안 검토가 필요하며 이번 배포에서 교체하지 않았다.
- DONE(읽기 범위): Toss 고정 기존 주문 GET **HTTP 200 / MID 일치**. UI 오류 코드 필드는 성공 응답에도 `UNCLASSIFIED`로 표시한다. 이 값 자체를 Toss 오류로 해석하지 않는다. Pages→Toss 해당 읽기 경로 접근과 Secret으로 조회한 MID 일치는 확인했다.
- NOT TESTED: LIVE Client/Secret 쌍 일치, 카드 인증/실제 승인 성공, 과거 INVALID_UNREGISTERED_SUBMALL 재현. 조회 200은 결제 승인 성공 증거가 아니다.
- HOLD: 운영 SQL 미적용. authenticated 직접 payment_order 실행의 서버 DB 제한은 아직 적용되지 않았다. Worker 차단을 직접 RPC 차단 완료로 보고하지 않는다.
- PAUSED 유지. SQL 적용·결제 활성화·실제 결제·환불·스토어 제출 모두 0. Finance 인증 실패 및 SQL HOLD가 남아 있으므로 실제 결제 재시험 준비 완료로 판정하지 않는다.

코드 검증은 앞서 완료한 WEB 2,078 PASS / 5 SKIP / 0 FAIL, TypeScript·변경 ESLint·webpack build PASS를 사용했다. 이번에는 코드 변경 없이 승인된 산출물을 배포하고 배포/브라우저 읽기 검증만 수행했다. 비Owner 운영 계정 실브라우저 차단은 NOT TESTED(합성 테스트 PASS).
