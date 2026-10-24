# Math 회차 연결 — Owner 운영 설치 확인

Owner가 2026-10-25 제공한 `math_session_contract`와 `math_session_boundary`가 운영 근거다. 기존 Math는 문항별 `authorize_billing`으로 1개를 예약하고 `math_billing_bindings`는 평가/decision 1:1을 강제한다. 이를 여러 문항에 반복 호출하는 과금 경로는 회차 제출에 사용하지 않는다.

## 보존 및 영향

- 기존 평가 함수, 출력 검증, 이미지 추출/확인, 공개 admission, Registry, 프로필, 문항/시험 ID, Secret은 교체하지 않는다.
- 기존 `math_billing_bindings` 및 UNIQUE/불변 trigger를 그대로 유지한다. 새 회차만 private session 관계를 사용하며 기존 Ledger에 회차당 하나의 decision/reserve/consume을 기록한다. 기존 경제 기록 UPDATE/backfill 없음.
- 기존 함수 변경은 `authorize_billing`, `settle_billing`, `release_billing`의 회차 경로 분기와 `learning_eligibility`, `math_learning`의 기존 무료 재첨삭 호환에 한정한다. 세 함수는 essay_executor, 두 함수는 postgres 소유권과 ACL을 보존한다. 기존 단독 평가 경로는 원래 함수 본문으로 처리된다.
- 새 테이블: session_runs/members/evaluations/retries 및 함수 정의 복구용 backup. 공개 4 RPC는 authenticated의 자기 계정만 허용하며 anon/service_role 금지. 기존 Worker 역할 및 자격 증명 변경 없음.
- 최초/부분 제출1, 무료 재첨삭0, 확인된 실패만 같은 회차 재처리0. 성공 결과 재평가 없음. UNKNOWN/PROCESSING은 새 요청으로 우회하지 않는다.
- 재첨삭은 기존 문항 집합·원본 predecessor/result·14일1회를 유지한다. 처음 제출하지 않은 문항은 새 유료 root. 기존 APP 단일문항 무료 재첨삭 호출도 같은 회차의0Credit 경로로 연결한다. 다문항을 기존 단일문항 호출로 축소하면 거부한다.
- 문항 ID는 기존 math_catalog의 essay_question_id로만 연결하며 leaf ID와 구분한다. 현재 운영 admission은 건국 기존 leaf1개만 허용한다. 로컬 다문항 검증은 합성 catalog를 사용하며 실제 운영 공개 범위를 늘리지 않는다.
- lifecycle gate/소유권 유지. 삭제 시 미정산 회차의 reserve를 release하고 경제 기록은 보존한다. 이미지 원본 삭제 의무는 기존 Storage 경계를 그대로 따른다.

## 실행과 복구

Owner 실행: 상위 폴더 `math-session-install.sql` → `math-session-verify.sql`. 설치 전 다섯 기존 함수 본문 fingerprint와 소유권을 검사한다. 불일치 시 트랜잭션 전체가 중단된다. 임의로 guard를 제거하지 않는다.

`math-session-rollback.sql`은 회차 및 해당 금융 결정이 한 번도 생성되지 않은 빈 설치에만 허용한다. 기존 함수 정의/소유권/ACL을 복구하며 적용 후 다른 변경이 감지되면 중단한다. 사용 후에는 원본 기록을 보존하는 forward fix가 필요하다. 진행 중 회차가 있으면 이전 문항별 서버로 롤백하지 않는다.

WEB 운영 배포 전 새 RPC 적용 확인이 필요하다. SQL 설치 자체는 기존 사용자 행이나 Ledger를 변경하지 않는다. 이후 승인된 학생 제출만 기존 Ledger에 정상 기록한다. 이 문서는 전체 WEB 수정 완료 보고가 아니다.

## 검증

`test_session.py --pg-bin /opt/homebrew/opt/postgresql@17/bin`은 기존 APP의 실제 migration/평가/정산 fixture를 임시 Unix-socket PostgreSQL17에 로드한다. 원격 DSN/Provider 연결 없음. 기존 fixture 파일 및 APP 코드는 수정하지 않는다.

- 비-superuser 설치/빈 복구, 기존 함수 owner/ACL 및 원본 결과/Ledger 보존.
- 1/2/4문항1Credit, 요청 재호출/완료 재호출, 동시8요청1예약.
- 무료 재첨삭0, 최초 미제출 문항의 무료 추가 거부, 기간 만료 거부.
- 부분 성공 후 실패만 재처리, 성공 결과 동일 bytes, UNKNOWN 재처리 차단.
- 이미지 미확인 제출 차단·원자 rollback, 기존 추출/확인0, 이미지 회차1, 원본 추출 유지. 합성 Storage receipt이며 실제 업로드 검증 아님.
- 자기 History/문항 ID/다른 계정 차단, RPC/테이블 권한, 삭제 예약 해제, 사용 후 제거 차단.
- 기존 APP `math_learning` 무료 재첨삭 호환 및 기존 Math131 회귀 PASS.

2026-10-25 Owner 실행 결과: 공개 4 RPC의 authenticated EXECUTE/anon·service_role 거부/고정 search_path, RLS, 테이블 설치, 임시 CREATE 제거, 기존 binding UNIQUE, 설치 정의 일치, 기존 owner/ACL 보존 모두 PASS. 이 결과는 설치 메타데이터 검증이며 실제 운영 학생 제출 성공을 뜻하지 않는다.

남은 검증: WEB 화면/History 통합·PC/모바일, 실제 로그인 공통 데이터, 배포 후 기존 기능. 운영 Provider 평가를 추가 실행한 것으로 보고하지 않는다.
