# 작업 05-D — 관리자 공부시간·탈퇴 관리 운영 적용

2026-11-11 KST. Owner의 단계별 조건부 운영 승인을 확인하고 05-C 후보 `5019fb0`에서 이어서 진행했다. 배포 전 확인된 canonical은 `9788a7ca-28c3-4437-9c7e-c20710176bd4`, source `0eefc7d880b4ffe9d560b1b7a60c7b4cd713cd90`였다. 미적용 상태를 확인했으며 중복 설치하지 않았다.

## SQL 단계 — PASS

- `20261111133958_admin_dashboard_study_all_time`: 승인된 공부시간 함수 1개만 교체. baseline/ACL 사전 검사 및 적용 후 hash `2a74d4b3612953760d4ae73403cb3f96` 확인.
- 전체 기간: 28명 / 205,102,629ms. 원천 range union과 독립 sweep-line 계산 일치. 학교 입력 181,949,542ms + 미입력23,153,087ms, 학교15개.
- 고정 최근30일 `[2026-10-12T15Z,2026-11-11T15Z)`: 전후 27명 / 205,098,836ms, 학년별 집계까지 동일. 전체를30일로 대체하지 않았다.
- 실제 로그인된 운영 관리자 대시보드에서 ‘전체’ 선택 → 총 공부시간56시간58분 정상. 05-C WEB 배포 전 희망대학 카드의 전체기간 미지원 처리는 다음 WEB 단계에 포함한다.
- 위 검증 통과 후 `20261111134117_admin_withdrawal_read_management` 적용. `admin_withdrawal_list(text,text,text,integer,integer,jsonb)`, `admin_withdrawal_detail(uuid)` 추가만 수행.
- 대기3 / 처리중0 / 오류0 / 최근30일완료0. 대기3건 상세 모두 조회. 공부·모의고사·실제지원 기록0, 희망대학 합계5, 북마크1, 최근열람 자료2. 최근열람은 반복 클릭수가 아니다. 원천 테이블·기존 개인 누적 함수와 대조 PASS.
- 관리자 허용, 일반회원/탈퇴대기 actor/anon 차단을 실제 DB의 READ ONLY role/claims 문맥에서 검증. 이 검사는 서명 JWT의 HTTP 검증과 구분한다. 실제 REST 비로그인3RPC 모두401/42501. 관리자 브라우저의 탈퇴 화면 E2E는 WEB 단계 이후 확인한다.
- 함수 STABLE/SECURITY DEFINER/빈 search_path/8초 timeout/ACL 검사 PASS. 신규2RPC는 authenticated EXECUTE 뒤 서버 admin_operator+account_private.allowed 검사. anon/service_role 직접 실행권한 없음.
- 전후 기존286함수 중 공부시간1개만 변경. 기존 테이블권한127·RLS120·관리자명단·auth 계정 상태·탈퇴요청3건 해시 동일. 기존 회원/홈/개인 공부시간 관련7함수 해시 동일. DML·탈퇴 실행·평가·지급·차감·결제·환불0.
- 보안 advisor 새 항목은 신규2함수의 authenticated SECURITY DEFINER 실행 경고2개다. 실제 비관리자 차단 검증과 내부 권한 검사로 검토했으며 권한을 넓혀 해소하지 않았다. 기존 권고는 유지. [Supabase 권고 설명](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## WEB 배포 준비

- 운영과 현재 Git의 `functions`, `cloudflare`, `_headers`, `_redirects`, `_routes.json` 차이0. 동일 Functions 원본 재컴파일, 현재 운영 Functions 경로 설정과 정확히 일치.
- 기존 `material-sync-admin-preserved.mjs` 흐름을 재사용한 `scripts/deployment/withdrawal-admin-preserved.mjs`: 기존 manifest2491개 기반 /admin 및 새 정적 chunk만 교체, 다른 페이지/Worker 설정/바인딩 보존. dirty tree·canonical/config/route drift·공유asset충돌 시 중단.
- 운영 NEXT_PUBLIC 설정을 메모리에서 전달한 Next production build PASS. 비밀값 출력/커밋 없음. 05-C의 기존 신규41검사는 배포 전 재확인.
- WEB 배포 ID 및 실제 탈퇴 탭 E2E 결과는 배포 후 이 문서에 추가한다.

## 기존 실패·원복·범위

05-C에서 전체 관리자 검사243 PASS / 기존6FAIL /1SKIP 및 기존비동기오류1, checkout 문구 검사1실패가 남아 있다. 권한/API 결함과 분리된 기존 fixture/문구 불일치이며 이번 범위에서 확대 수정하지 않았다. 신규35탈퇴+6기간 검사는 별도 PASS. 기존 상세분석은 [05-C](admin-study-period-contract-20261111.md), [05-B](admin-withdrawal-rpc-preflight-20261111.md).

실패 시 다음 단계 중지. WEB은 직전 운영 artifact로 복귀하고, 필요하면 공부시간 후보의 해시 guard rollback으로 이전 정의만 복구한다. 탈퇴 관리2함수는 EXECUTE 회수 또는 후보 rollback(DROP 함수만, CASCADE 없음). 사용자·탈퇴요청·학습·원장 행은 삭제하지 않는다. 기존APP·스토어 제출은 이번 작업 범위 밖이다.
