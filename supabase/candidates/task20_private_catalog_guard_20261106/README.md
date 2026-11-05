# TASK20 신규 86시험 Catalog 비공개 보완 후보

Owner 승인 후 운영 적용 완료(2026-11-06). 평가 공개 활성화는 포함하지 않는다.

## 발견한 차이

검수용 등록 행의 `is_active=false`, `is_published=false`는 그대로다. 그러나 기존 `essay_browse_catalog()`는 이 상태와 무관하게 모든 Registry 시험명·문항명을 반환한다. 운영 DB의 `authenticated` 역할 읽기 검사에서 숙명30/한양19/중앙17/광운20 시험의 메타데이터가 반환됐다. 평가 가능 플래그는 전부 false이며 PDF·답안·평가 근거는 이 RPC에 포함되지 않는다.

이 검사는 DB 역할 검사이고, 실제 일반 계정 브라우저 E2E 완료를 뜻하지 않는다.

## 정확한 변경 범위

- `public.essay_browse_catalog(text)`의 기존 SELECT에 승인 등록된 86개 시험 ID 제외 조건만 추가한다.
- 기존 42개 대학의 등록 전 Catalog 결과는 정확하게 보존한다.
- 검수용 Registry 행은 그대로 유지한다. 검수 관리자 전용 조회 RPC는 수정하지 않는다.
- 기존 평가 실행·Provider·이용권·History·결제·공개 활성화·APP58은 변경하지 않는다.
- 향후 검수와 공개 승인이 완료되면, 그 시험만 별도 승인된 공개 변경에서 제외 목록에서 해제해야 한다. 검수 완료만으로 자동 공개하지 않는다.
- 임시 대학별 UI 예외가 아니라 이번 비공개 등록 범위의 Backend 노출 제한이다.

## 적용 / 원복

1. 사전 함수 정의 해시 `7a5d5ee547e406222a67d51fe310c7d8` 및 신규 대상의 공개 정책 부재를 다시 확인한다.
2. Owner 승인 후 `apply.sql` 적용. 다른 변경으로 함수 정의가 달라졌다면 자동 중단한다.
3. 일반 사용자 역할 Catalog에서 신규 86건 0, 기존 결과 동일, 함수 ACL 동일 확인.
4. `rollback.sql`은 적용 후 해시가 일치할 때만 원래 함수를 복원한다. Registry·학습 기록 삭제는 없다.

## 검증

`local-test-result.json`: 격리 PostgreSQL에서 원래 Catalog 42개 별칭의 결과를 저장한 뒤 신규 86건을 추가하고, 필터 적용 후 등록 전 결과와 전체 JSON이 일치함을 확인했다. ACL 보존 및 정확한 원복 PASS. 운영 적용은 아직 하지 않았다.

재현 도구: `scripts/essay-materials/task20_test_catalog_guard.py` (읽기 스냅샷은 비공개 로컬 입력). `role-readback.json`은 운영 authenticated 역할의 메타데이터 노출 수치이며 사용자 개인정보가 없다.

## 운영 적용 결과

`production-postflight.json` 참조. 최초 실행은 SQL 문장 종료 누락으로 실패했고 원래 함수 해시 유지 확인 후 파일 전체 적용·원복 로컬 검증을 추가했다. 수정된 파일 적용 성공. 86개 메타데이터 비공개, 기존 Registry 전체 행 해시와 기존 42개 대학 Catalog 결과 및 ACL 보존. 일반 로그인 WEB에서 네 대학 기존 목록 유지 확인. 검수 전 Package 공개는 하지 않았다.
