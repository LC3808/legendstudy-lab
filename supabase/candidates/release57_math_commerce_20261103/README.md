# LegendStudy 수리·상경 논술 Release57 SQL 검토 패키지

**운영 적용 0회, 실제 Provider 호출 0회. 격리 TEST 전용 증분은 적용·postflight 검증했으며 유료 출처 실제 smoke는 잔액0으로 PARTIAL이다. 이 패키지는 운영 실행 완료 보고가 아니다.**

기존 Registry·Evidence·평가 엔진·이용권·Ledger·History를 재사용한다. 운영 읽기 전용 함수/권한/테이블 스냅샷에 맞춰 작성했다. 별도 시험 DB, 신규 결제 시스템, 기존 학생 기록 backfill은 없다. Supabase CLI 2.114.0으로 migration 파일을 생성했다.

## 적용 후보와 순서

1. `20261103144209_math_commerce_learning_incremental.sql`: 기존 F/G의 coaching, 서버 공개 제어, 반복 첨삭, 혼합형 힌트/History를 증분 설치한다. TEST install/seed/session baseline은 포함하지 않는다.
2. `20261103144918_math_commerce_release_scope.sql`: 기존 운영 Registry의 인하대 자연계 15시험 및 한양대 2026 상경 1시험, 수리 46문항과 기존 건국대 1문항(합계 47문항)을 catalog/admission에 연결한다. 실제 기존 question FK를 사용하며 기존 건국대의 단일 legacy 연결만 명시적으로 보존한다.
3. `20261103145501_math_commerce_beta_credit_connection.sql`: 기존 daily-v2 캠페인에 승인된 16시험 scope를 추가하고 동일한 이용권 출처 계약을 Math Session에 연결한다. 기존 캠페인 기간·일일 횟수·Ledger를 변경하지 않는다.

각 파일은 단일 transaction이며 원문 해시/owner/ACL/config/테이블 조건이 다르면 중단한다. 이미 설치되었거나 중간 상태라면 임의로 guard를 삭제하지 않는다. 대상 상태를 다시 읽고 별도 증분 후보를 작성해야 한다.

## 보존 및 수정 내용

- 11개 운영 함수의 `md5(pg_get_functiondef)`와 owner/ACL/config, 기존 run 테이블의 컬럼·기본값·제약·권한·RLS를 전제조건으로 확인한다. 원본 `source_hash`는 공백 정규화 출처 정보이며 raw-prosrc 해시로 오인하지 않는다.
- 임시 SET 역할 연결만 사용하고 원래 `supabase_admin → postgres` ADMIN=true/INHERIT=false/SET=false 관계와 스키마 CREATE·REFERENCES 권한을 정확히 복원한다.
- `session_runs`에는 nullable `previous_run_id`, `submission_index` 및 연결 제약만 추가한다. 기존 행의 값이나 기존 이용권·평가·History를 덮어쓰지 않는다.
- 원본 결과 RPC는 내부 이름으로 보존하고 클라이언트 접근을 차단한다. 공개 RPC는 정답 비공개 projection을 반환한다. 인문논술 결과의 바이트 동등성을 검증했다.
- 공개/힌트 기록은 RLS를 적용한 기존 F/G 신규 private 테이블을 사용한다. 클라이언트 직접 권한은 주지 않는다. common History projection을 위해 postgres에 `coaching_disclosures` SELECT만 부여한다.
- 혼합형 힌트는 동일 client key 동시 요청을 직렬화하고 다른 payload 재사용을 거부한다. 1단계 없이 2단계 힌트를 요청할 수 없다.
- 전체 해설 공개 여부와 재작성 전 공개 여부를 실제 disclosure 시각으로 History에 반영한다. 늦은 공개가 이전 재작성의 사실을 소급 변경하지 않는다.
- 무료 재첨삭 유효기간은 최초 완료 후 14일과 beta `daily_grants.revision_cutoff` 중 빠른 시각이다. 당일 사용권의 다음 자정 `credit_grants.expires_at`으로 재첨삭 기간을 잘못 단축하지 않는다.
- 기존 beta scope의 인문논술 eligible 분기는 유지한다. 신규 수리 scope만 Owner 승인 16시험과 기존 runtime policy/문항 집합에 묶는다. beta 종료는 **2026-11-11 00:00 KST**, 일일 1회, 이월 없음이다.
- `math_session_quote_source`는 기존 `credit_source`의 출처/잔량/선택 grant를 반환한다. `math_session_continue_source`는 학생이 확인한 grant와 실제 차감 출처가 달라지면 `CHARGE_SOURCE_CHANGED`로 중단한다. beta가 소진됐다고 유료 이용권으로 자동 전환하지 않는다.
- 응답 유실 재시도는 기존 key·원래 grant로 같은 run을 반환한다. 이전 앱에서 만들어 grant 정보가 없는 pending은 **이미 존재하는 동일 요청의 재조회만** 허용하고 새 차감은 거부한다. 무료→유료 변경(`CHARGE_CHANGED`)도 클라이언트 재확인 대상이다.
- 기존 review가 NEEDS_REVIEW여도 runtimeApproval.APPROVED 및 digest/문항 pin을 충족하는 자료는 기존 운영 계약을 그대로 사용한다. 리뷰 상태를 VERIFIED로 바꾸거나 첨삭 품질을 PASS로 꾸미지 않는다.

## 검증 결과와 한계

`validation.log`는 개인 정보 없는 임시 PostgreSQL17, Unix socket, 합성 사용자/답안만 사용한 검증이다. 모든 신규 runtime 검증은 **NOSUPERUSER postgres**로 실행했다.

- 기존 Math 회귀 131개 및 1/2/4문항·한 회차 이용권 1개·소유권·OCR 확인·실패 문항 재시도·8개 동시 요청 통과.
- 운영 원문 11함수와 두 run 테이블을 로컬에 재구성한 뒤 **core 후보 전체 DDL** 적용, 원래 권한/기존 Ledger·History 보존 통과.
- 임시 권한 이후/함수 교체 이후/commit 이전의 3개 의도적 실패 전체 롤백, 원문 변경·중복 설치 fail-closed 통과.
- 2문항×6회차의 1/0/1/0/1/0 차감, 무료 정확히 1회, 일부 완료 방지, 동일 History 연결, 14일/베타 cutoff 통과.
- 실제 운영 `essay_exam_history` 원문과 beta helper를 사용해 혼합형 공개 전 마스킹, 인문논술 결과 바이트 보존, 소유권, hint/reveal 재시도 통과.
- 혼합형 동일 key/다른 task 동시 요청: 성공 1개·충돌 1개. 1단계 없는 2단계 요청 거부 통과.
- 공개 전 모든 생성 결과 필드 비공개, 최대 5개 과제, 명시적 공개, 공개 시점과 재작성 이력 관계 통과.
- 47문항 catalog 및 canonical/legacy 연결, max50, 타 사용자/범위 밖/runtime HOLD 차단 통과.
- 기존 출처 선택기를 통한 beta 우선, 이전 출처 견적 거부, 유료 자동 전환 차단, 무료 1회/다음 유료, 이전 날짜 grant 거부, 새 source RPC의 8개 동시 재시도에서 reserve/consume 각각 1건 통과.
- 격리 TEST의 별도 원문 9함수·권한 상태를 재구성한 **TEST 전용 후보 전체 DDL** 및 실패 롤백도 별도로 확인한다(`test-upgrade/` 설명 참조).

**검증 구분:** core 후보는 정확한 운영 원문/테이블을 재구성해 전체 transaction을 실행했다. scope/beta 후보는 실제 공식 자료 전체를 로컬에 복제하지 않았으므로 **함수 본문 동작을 합성 47문항 fixture에서 검증**했다. 운영의 실제 16개 runtime package는 읽기 전용 호출로 검증되었지만, scope/beta 후보 전체 guard transaction을 운영에 실행한 것은 아니다. 대상 Supabase의 전체 trigger·extension·HTTP 경계·실제 Provider·실기기 제출 품질은 이 로컬 결과에 포함되지 않는다.

## 적용 담당자 절차

1. 확대 범위의 dispatch를 HOLD한 상태에서 최신 DB 백업과 원문/권한 스냅샷을 확보한다. 이 문서의 파일 존재만으로 적용됐다고 판단하지 않는다.
2. core → scope → beta 후보 순서로 Owner가 검토한 대상 DB에서 실행한다. 실패 시 transaction 전체를 롤백하고 오류를 조사한다.
3. `postflight.sql`의 함수/권한 결과를 `expected-core-postflight.json` 및 `expected-activation-postflight.json`과 비교한다. raw legacy RPC는 authenticated/anon/service_role 모두 접근 불가여야 한다.
4. Worker/WEB/APP이 동일한 공개·History·출처 확인 계약을 사용하도록 검증한다. 최초/다음 유료 견적 직전 기존 daily claim을 호출하며 알려진 무료 재첨삭에는 호출하지 않는다. TEST에 daily 캠페인이 없을 경우 이를 실제 beta 통과로 보고하지 않는다.
5. 확대 범위만 활성화하고 동일 사용자 조회·힌트·해설·재첨삭·History와 기존 인문논술을 확인한다. Secret의 가려진 값을 원문처럼 저장하지 않는다.
6. 문제 발생 시 확대 범위 dispatch/allowlist를 HOLD한다. 필요하면 `hold-only-rollback.sql`로 새 Math 평가를 멈춘다. **마스킹·공개 이력·기존/신규 History·Ledger는 보존**한다. 원본 결과 RPC를 다시 공개하는 옛 rollback은 실행하지 않는다. 인문논술 전체 runtime 플래그를 끄지 않는다.

보안 검토는 [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)의 명시적 search_path/EXECUTE 권한 원칙을 따른다. 변경 기록을 확인했으며 최신 시간대 공지는 UTC timestamp와 명시적 Asia/Seoul 일자 정책을 변경하지 않는다.
