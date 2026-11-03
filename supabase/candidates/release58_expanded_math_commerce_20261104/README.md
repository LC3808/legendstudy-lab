# APP58 보존 · 수리/상경 확대 연결 SQL 후보 — 2026-11-04

상태: **검토용 후보, 이 패키지로 운영/TEST DB를 변경하지 않음**. APP58 IPA/AAB·소스와 기존 release57의 16시험 후보를 보존한다. 기존 Registry·Evidence Package·Credit·Ledger·History를 연결하며 새로운 시험 데이터나 평가 엔진을 만들지 않는다.

## 정확한 범위

- 기존 beta 160시험은 행 전체를 그대로 보존한다.
- 신규 42시험: 비의예 수리/혼합형 41시험(혼합 26, 자연 15) + 서강대 2026 경제경영 1시험(Essay-only지만 기존 business 정책).
- beta 전체 202시험. Math catalog는 canonical 71문항 + 기존 건국 legacy 1문항 = **72문항**.
- 의예 9시험과 승인 package가 전체 Registry 문항을 포함하지 않는 고려대/숙명여대 2시험은 신규 전체시험 활성화에서 제외한다. 기존 공개 자료나 Registry 행을 삭제하거나 비공개로 전환하지 않는다.
- 실제 운영 runtime_package 213건의 읽기 검증, 공식 근거·권리·digest·question mapping 검증을 재사용했다. 이 결과는 OCR·AI 첨삭 품질 PASS나 운영 활성화를 뜻하지 않는다.
- 베타 정책은 하루 1회, 00:00 KST 초기화, 이월 없음, **2026-11-11 00:00 KST 종료** 그대로다. 재첨삭은 각 사이클 1회, 최초 완료 +14일과 beta revision cutoff 중 빠른 시각까지다.

## 적용 순서와 구현

1. `20261103144209_math_commerce_learning_incremental.sql`: 기존 검증 core와 SHA256가 동일하다. 공개 제어·힌트/공개 이력·반복 첨삭 연결을 추가하며 기존 이용권 및 평가 사실을 수정하지 않는다.
2. `20261103155019_expanded_math_commerce_release_scope.sql`: 기존 41시험의 공식 package/review revision/digest, **전체 Registry question set**, canonical leaf 연결을 고정한다. 범위 밖/원문 drift이면 transaction 전체를 중단한다.
3. `20261103155021_expanded_math_commerce_beta_connection.sql`: 기존 160행을 보존하고 42행만 추가한다. 이전 scope 함수의 정확한 해시를 요구한다. campaign·기간·일일 제한을 변경하지 않는다.

APP58은 `math_catalog(p_limit:50)`를 고정 호출하고 paging이 없다. 따라서 `50`은 승인된 전체 catalog를 반환하는 호환 요청으로 처리한다(최대 512, 현재 72). JSON 배열 응답 형식은 같다. 1~49의 작은 limit은 그대로 지킨다. 51~512는 지정한 수만 반환한다. 무제한 Registry 공개가 아니다.

`math_private.release_catalog(exam)`는 내부 전용이다. 클라이언트 EXECUTE를 차단한다. Session의 문항 소속 확인과 최초 quote는 이 내부 시험별 catalog를 사용하므로 UI의 20/50 제한이나 정렬 순서에 따라 이용 가능한 시험이 누락되지 않는다. 제출·계정 소유권·중복 key·차감 출처·무료 1회 정책은 기존 서버 계약을 사용한다.

서강대 Essay-only business는 명시적 42시험 pin 및 `has_math=false` 조건에서만 beta 출처를 사용할 수 있다. 기존 humanities eligibility 분기는 그대로다. medical/불완전 시험에 같은 권한을 넓히지 않는다.

## 데이터 보존 검토 — 일곱 항목

1. 원본 사진·학생 전사·평가·Ledger를 UPDATE/삭제하지 않는다. 기존 불변 답안/평가와 동일한 식별자를 재사용한다.
2. 추가 저장은 disclosure/hint 시간 및 nullable cycle 연결이다. 기존 행의 의미를 덮어쓰는 backfill은 없다.
3. 원본 응답 함수는 내부 이름으로 보존하고 클라이언트 접근을 차단한다. 과거 평가 snapshot은 수정하지 않는다.
4. 조회/공개/재첨삭 주체는 기존 `auth.uid()`와 소유권 검사로 유지한다. 새 플랫폼별 계정을 만들지 않는다.
5. 학습 결과/공개 이력과 billing decision·Credit 거래를 분리한다. 새 이용권 원장을 만들지 않는다.
6. 기존 RLS·계정 삭제 cascade·보존 기간을 넓히지 않는다. 신규 private 이력은 기존 소유자/삭제 관계를 따른다.
7. coaching은 파생 projection이며 원본 AI 결과·학생 확인 전사와 구분한다. 늦게 공개한 시각이 과거 재작성 사실을 소급 바꾸지 않는다.

## 검증과 한계

`validation.log`: 임시 Unix-socket PostgreSQL17, 합성 사용자/답안, 외부 Provider 0회.

- 기존 Math 회귀 131개, 실제 운영 원문/ACL로 재구성한 core **전체 DDL** 및 3개 실패 지점 rollback PASS.
- NOSUPERUSER postgres, 임시 SET/CREATE/REFERENCES 복원, 기존 Ledger·History 보존 PASS.
- 2문항×6회차 1/0/1/0/1/0, 무료 정확히 1회, 중복8요청 차감1건,14일/beta cutoff PASS.
- 혼합형 공개 전 마스킹/누적힌트/명시적 공개/History/기존 인문 결과 바이트 보존 PASS.
- catalog72, APP58 호환50, 작은 limit1/20/49 및 51/512, 내부 helper ACL PASS.
- 마지막 catalog 문항의 quote→submit→완료를 UI catalog가 빈 배열인 경우에도 정상 수행: UI 제한과 서버 권한 분리 PASS.
- 실제 후보의 전체 question set guard predicate: Registry 새 문항 추가 시 fail-closed, rollback 후 정상 PASS.
- 서강 business Essay-only 허용, 불완전 시험 제외, 범위 밖/다른 사용자/runtime HOLD 차단 PASS.

**scope/beta 전체 target transaction은 NOT_RUN**이다. 확대 함수 본문은 합성 72문항 fixture에서 검증했고, 실제 대상 package pin은 운영 읽기 전용 검증을 사용했다. 대상 DB 전체 extensions/triggers/HTTP/Provider/실기기 품질까지 이 로컬 검증으로 PASS 처리하지 않는다.

전체 official package를 로컬 fixture로 내보내는 추가 검증은 자동 승인 검토가 proprietary 원문 payload 반출을 사유로 거절했다. 우회하지 않았고 원문 반출도 없다. 메타데이터/합성 자료 검증은 완료했다. 실제 원문을 복제한 full-transaction 검증이 필수라면 그 반출은 별도 Owner 승인 대상이다.

## 원본 백업 · 적용 전후 검사

- 안전한 함수/ACL 원본 스냅샷은 `/tmp/legendstudy-expanded-production-originals-20261104`(디렉터리700/파일600). 수정 대상의 기존 함수 해시는 현재 운영과 일치한다. 기존 지원 함수 스냅샷도 포함하며 학생 데이터/Secret은 없다. 자동 복원 스크립트가 아니다.
- `production-preflight-receipt.json`: core11/scope3 원문·owner·ACL·config,58개 table/index 메타데이터 일치. scope/new namespace 충돌 없음. 실제 SQL 실행 역할 postgres 확인.
- `production-protected-baseline.json` / `protected-baseline.sql`:14개 보호 테이블의 count·행집합hash만 보관. accounts144/grants154/transactions243/billing72/payment events36/operations9/orders18/math bindings11/math evaluation11/math runs0/essay runs54/campaign1/scope160. 사용자 원문은 없다.
- `verify-core.sql`은 core 직후, `verify-expanded.sql` 및 `verify-expanded-scope.sql`은 전체 연결 직후 읽기 전용 검사다. 함수 원문hash/owner/ACL/config, raw endpoint deny, role membership 및 private table 보호를 확인한다.
- 운영의 자연스러운 신규 거래가 baseline 이후 생길 수 있다. 차이는 시간·실제 변경 주체와 대조하며 기존 사실을 지우거나 baseline에 맞추지 않는다.

## 구 WEB과 배포 순서

기존 운영 WEB은 새로운 coaching 응답을 모를 수 있다. core는 Math raw RPC를 안전 projection으로 바꾸므로 core 단독 장기 운영을 피한다. 인문 결과 바이트는 보존되지만 legacy Math 화면과 원본 detail 응답은 영향을 받는다.

1. 확대 dispatch는 HOLD한다. 필요하면 짧은 전환 동안 Math만 HOLD하고 Essay 전체 runtime은 유지한다.
2. 위 SQL을 core→scope→beta 순으로 검토/적용하고 각 단계 postflight를 확인한다.
3. 같은 42시험 manifest·72문항 allowlist·coaching/source 계약의 신규 WEB/Worker를 연결한다. APP58 바이너리는 변경하지 않는다.
4. 기존 인문 및 legacy Math 결과 조회, 신규 시험 선택/quote, 명시적 해설 공개와 History를 확인한 뒤 Owner 승인 범위만 연다.
5. beta claim은 기존 서버 allocator를 사용한다. 실제 E2E와 합성 SQL PASS를 분리하고 Provider 호출은 최소화한다.

오류 시 확대 flags/allowlist를 HOLD한다. `hold-only-rollback.sql`은 Math 신규 평가를 중단한다. 마스킹·공개 기록·History·Ledger를 보존하며 원본 raw endpoint를 다시 공개하는 과거 rollback을 실행하지 않는다. 인문 전체 runtime/계정/Auth/결제 설정을 변경하지 않는다.

## Provider · 전환 시 미처리 행 · 완료 의미

2026-11-04 KST 현재 41시험의 Math context 71건은 모두 `openai / gpt-5.6-sol`이며 Pages 기본 모델과 일치한다. Math evaluation은 COMPLETED10/FAILED1, session은0건이다. OCR PROCESSING2건과 Essay reserved1건은 2026-10-26 생성된 오래된 행이고 lease가 같은 날 만료됐다. 활성 lease와 새 작업으로 오인하지 않고 기존 이력 그대로 보존한다. 이 패키지는 재시도·취소·환불을 실행하지 않는다.

Math Session의 `completed`는 **사용자가 제출한 선택 문항 집합**의 완료다. APP58은 제출 전 누락 문항을 나열하고, ‘이용권 1개로 선택한 문항을 첨삭’한다고 확인받는다. 이를 전체 시험의 모든 문항 완료로 보고하지 않는다. 본 검증의 부분 완료 방지는 제출 집합 내 미완료 문항이 있을 때 완료 처리하지 않는다는 의미다. 혼합형 전체 시험은 기존 Essay parent의 전체 질문 집합/Worker 제출 계약을 별도로 확인해야 하며, 자연계 선택 문항 완료를 혼합형 전체 완료 PASS로 대체하지 않는다.

검증 재실행: `validation/run_validation.py --pg-bin /opt/homebrew/opt/postgresql@17/bin` (기존 LegendStudy Python venv의 psycopg 및 APP 저장소 baseline fixtures 필요). raw 함수 스냅샷은 Git에 추가하지 않는다. 테스트 소스의 `/tmp/legendstudy-release57-production-*.json` 입력은 기존 읽기 전용 SQL/ACL 스냅샷이다. 공식 시험 원문·학생 원문·Provider 응답 복제를 요구하지 않는다.
