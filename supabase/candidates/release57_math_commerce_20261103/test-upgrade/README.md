# 격리 TEST 전용 source/History 증분 갱신

운영 DB용 파일이 아니다. `20261103150405_math_learning_source_upgrade_test_only.sql`은 2026-11-03에 읽은 격리 TEST의 기존 9개 함수와 권한에만 적용하도록 잠겨 있다.

- 기존 `essay_math_coaching`: 동일 요청 키 동시성 방어와 힌트 1→2 순서 강제.
- 기존 `math_learning`: 실제 공개 이력과 재작성 시각을 공통 History에 반영.
- 기존 `cycle_deadline`: beta 재첨삭 종료는 다음 자정 사용권 만료가 아니라 기존 `revision_cutoff` 사용.
- 기존 `math_session_submit`: 기존 이용권 출처 선택기를 재사용.
- 신규 `math_session_quote_source`, `math_session_continue_source`: 출처 확인·재동의·응답 유실 복구 계약.
- `coaching_disclosures`에 postgres SELECT만 추가하고 원래 역할 연결·RLS·공개 RPC ACL을 보존한다.

기존 TEST의 campaign/scope는 0개다. 이 파일은 캠페인·scope·이용권을 생성하지 않는다. 따라서 적용 후 기존 TEST 이용권으로 실행되는 source/retry/무료 재첨삭 검증을 일일 beta 캠페인 실증으로 보고하면 안 된다. beta 1일 1회·종료 시각은 별도 로컬 검증 결과로 구분한다.

실제 적용은 parent/담당자가 대상이 격리 TEST임을 확인한 후 수행한다. 적용 전 원문/권한 guard 및 독립 리뷰를 확인한다. 실패하면 전체 transaction이 롤백된다. 적용 후 `expected-postflight.json`과 함수 해시/owner/ACL/config를 비교하고 원래 회원·사진·평가·History·Ledger가 유지되는지 확인한다. 기존 사용자 자료는 수정하지 않는다.

공개 마스킹 wrapper를 제거하는 역방향 rollback은 금지한다. 문제 시 신규 source 경로를 HOLD하고 기존 History·원문·공개 이력을 보존한 수정본으로 해결한다. 이 파일의 원격 적용 자체와 실제 Provider 호출은 패키지 작성 단계에서는 수행하지 않았다.

## 2026-11-04 실제 격리 TEST 적용 확인

지정 TEST `kpqbedylxlyntrrfybpn`에 위 파일 해시 그대로 적용했다. 운영 적용은 하지 않았다. 신규/변경 6함수의 정의 해시·owner·ACL·search_path가 `expected-postflight.json`과 일치하고, 기존 답안·평가·회차·원장·공개/힌트 기록 10종 행 수가 유지됐다(`applied-postflight.json`).

기존 TEST 계정으로 실제 HTTP 검증: 무료 재첨삭 견적은 이용권0개/included, 익명 신규RPC 접근 거절 PASS. 계정 잔액0으로 자연/상경 최초 견적은 정상적인 `INSUFFICIENT_CREDIT` 응답이어서 유료 출처·출처 변경 거절 원격 검증은 NOT_VERIFIED다. 기존 원장·History 전후 동일, Provider/신규평가/일일지급 호출0. 이 결과는 실제 Provider E2E·일일 beta 지급 검증이 아니며, 전체 smoke는 PARTIAL이다(`actual-source-smoke.json`).
