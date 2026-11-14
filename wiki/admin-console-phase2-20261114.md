# 관리자 운영 콘솔 PHASE 2 — 2026-11-14

상태: 운영 SQL 적용, WEB 배포·브라우저 검증 진행 중. 기존 [P0 구현](admin-lab-operations-20261114.md)은 재개발하지 않았다.

설계 기준: [Claude 최종 3e84708](https://github.com/LC3808/legendstudy-lab/blob/3e84708/wiki/admin-essay-operations-ia-20261114.md). 이전 72cfdd6의 6그룹보다 최종 7그룹을 우선한다. 학생 MY·학습입시 설계는 해당 문서의 참조 링크를 따른다. 실제 운영 계약이 설계의 추정 상태보다 우선한다.

## 구현 범위

- 운영 대시보드 / 회원·이용권 / 첨삭 운영 / 첨삭 품질 / 학생 피드백 / 학습·입시 분석 / 매출·비용·안정성. 모든 기존 URL 보존. `/admin/essay-runs`를 기존 메뉴에 노출한다.
- 이용권 상세의 기존 회원별 LAB 조회 재사용. 회차 상세↔처리 이력, 회차 상세→회원 피드백, 피드백→정확한 회차·문항→`/ql` 연결. 이메일로 관계를 추론하지 않는다.
- 회차 목록의 대학·시험·회원 검색·기간·상태·출처·페이지·선택 회차를 URL에 보존한다. 회원 상세에 포함된 목록은 별도 상태를 유지한다.
- 기존 `admin_lab_runs` (`admin-lab-v1`) 및 `admin_lab_run_detail` (`admin-lab-detail-v1`) 변경 없음. 앞선 Owner 요청의 서버 회원·시험·기간 검색만 새 읽기 함수 `admin_lab_runs_filtered`로 추가했다. 기존6인자 함수를 오버로드하지 않았다. 인증 관리자 전용·빈 search_path·5초 제한.
- `/ql`의 quality_operators 게이트와 저장 계약/불변 이력은 변경하지 않았다. 저장된 criteria, rubricVersion/evidenceVersion, evaluation만 별도 구획으로 표시한다. 없는 기준은 확인 불가. 현재 대학 기준을 과거 기준으로 대체하지 않는다.
- legacy hq-rubric-v1과 회차 hq-exam-rubric-v1은 원래 별도다. 실제 `ql_exam_submit`는 OPERATOR_REQUEST만 저장하며 selection_reason 입력을 거절한다. USER_REPORT는 legacy 계약에 있으나 회차 저장에는 미지원이다. 링크 유입을 USER_REPORT로 저장했다고 주장하지 않는다.

## 학생 코멘트 운영 복구

교차검증 결과 B: WEB/Flutter UI·RPC 호출 코드는 존재하지만 운영 submit/list/update 및 feedback_private는 없었다. WEB 배포 설정에도 활성화 플래그가 없었다. 실제 본문 원장은 기존 public.feedback_submissions이며 알림은 기존 feedback_notifications outbox다.

기존 APP `supabase/candidates/essay_feedback_v1` 계약을 재사용했다. 새로운 본문 원장을 만들지 않았다. 기존 후보의 private essay_context(회차·문항·멱등성 연결), actions(처리 감사)와 RPC를 설치했다. 원복은 RPC 권한 회수 방식으로 제출 본문·감사를 보존한다. 삭제 또는 기존 원장 수정 없음. 학생 결과 화면에서 기존 이진 만족도·선택 코멘트를 활성화한다. 별도 numeric-v2 정책은 도입하지 않았다.

- 학생: auth.uid 소유 회차/문항 검증, 활성 계정, 시간당10회, request_key 멱등성, 본문5000자. 다른 학생 결과 연결 거부.
- 관리자: admin_operator + 활성 계정. optimistic updated_at 검증, status 이력·메모 보존.
- 운영 트랜잭션 검증: 실제 관리자 본인의 기존 회차로 submit→admin read→update PASS 후 ROLLBACK. 테스트 댓글·알림 outbox 모두 비영속. 다른 학생으로 위장 제출하지 않았다.
- Flutter: 기존 `student_feedback.dart`에서 EssayFeedback(report.id) 진입 및 ESSAY_FEEDBACK_V1_ENABLED 기본 false 확인. 설치된 앱 빌드/실기기 활성화는 NOT TESTED, 이번 WEB 배포에 APP 바이너리 배포는 포함하지 않는다.

## 경고 집계

| 항목 | 기준 | 이동 |
|---|---|---|
| 실패 | 최근7일 접수 회차, admin_essay_operations.summary.failed | 전체 실패 목록(대상 범위를 링크에 명시) |
| 처리 중 | 기간 무관 현재 live.processing | reserved 회차 목록 |
| 재시도 대기 | 기간 무관 현재 live.retry_pending | 기존 운영 현황 |
| 신규 학생 피드백 | 전체기간 status=new, 기존 admin_essay_feedback | 신규 필터 사전 선택 |

임의 위험 등급·장시간 임계값은 만들지 않았다. 결과 누락/초과차감 등은 기존 개별 상세 진단을 유지하며 통합 집계는 확인 불가로 표시한다. 오래된 미완료1회에 재처리를 실행하지 않았다.

## Claude용 데이터 계약

1. 요청 원천: essay_exam_private.runs.created_at, credit_accounts.user_id 연결.
2. 회차 원천: runs.id; parent_id는 재첨삭 관계, retry_requests.generation은 같은 회차 재시도.
3. 학생 답안: runs.snapshot.answers; questionId 정확 연결.
4. AI 결과: runs.result.questions; questionId로 답안과 연결. local_reviews/telemetry는 기존 읽기 계약의 제거 규칙 유지.
5. 거래: runs.decision_id→essay_billing_decisions.id→credit_transactions.decision_id. 계정·거래 UUID를 사용.
6. 품질: human_quality_judgments의 exam_run_id/exam_question_id, 기존 ql RPC. 일반 관리자 권한으로 자동 승격하지 않음.
7. 베타: credit_transactions.grant_id→essay_beta_private.daily_grants.grant_id. promotion 또는 날짜만으로 판정하지 않음.
8. 피드백: feedback_submissions.id→feedback_private.essay_context.feedback_id; run_id/question_id/evaluation_ref; actions는 감사 이력.
9. 권한: 관리자 admin_operator/활성계정, 학생 auth.uid 소유권, 검수 quality_operators 별도. private 테이블 RLS 활성화, 직접 접근 부여 없음.
10. API: 기존 피드백 후보 복구 + 검색 읽기 RPC1개만 추가. 신규 평가·과금·검수 엔진 없음.

## 검증 및 보존

- 격리 PostgreSQL: 검색·페이지·기간 경계·권한·재실행 방지·원복 PASS. 피드백 기존 계약: 멱등성/소유권/관리자 감사/속도 제한/원본 비공개 필드 제거/원복 PASS.
- 운영 읽기 RPC 적용 전후 runs 및 credit_transactions 전체 해시 동일, 기존 admin_lab_runs 함수 해시 동일. 신규 보안 advisory 0 (기존5개 동일).
- 초기 관련 테스트74 PASS. 최종 전체·빌드·브라우저 결과는 아래 배포 검증 기록에 추가한다.
- 기존11실패: catalog-demand-projection, catalog-demand, public-discovery, university-theme, materials 각1; admin-analytics2; admin-console4. 기존1error는 admin-console의 오래된 dashboard mock이 study.total을 제공하지 않아 발생한 ms 접근 오류. P0의 깨끗한 기준에서도 재현된 실패다. 카탈로그 기대값/관리자 mock·문구 불일치가 포함되며 이번 데이터 쓰기나 엔진 회귀의 증거는 아니다. 실제 운영 화면은 별도 브라우저 확인한다.
- 이번 경고 제목 추가로 dashboard-focus의 기대 순서1개가 달라졌고 새 설계에 맞게 수정했다. 무관한 기존 실패는 수정하지 않았다.

운영 migration: `20261114140328_admin_lab_review_filters`, `20261114140655_essay_feedback_restore`. 적용·원복·격리 테스트는 각각 supabase/candidates 하위 동명 패키지 참조.

최종 자동화: 전체1991 PASS/기존11 FAIL/기존1ERROR/5SKIP. 마지막 관련13파일74PASS, TypeScript·변경ESLint·정적빌드 PASS. Boundary 검사 예외 추가는 자동 승인 검토가 거절하여 적용하지 않았다. URL 조건을 새 URLSearchParams로 구성해 보안 검사 변경 없이 해결했다. 기존 checkout 테스트환경 문구 위반1개는 별도 기존 실패로 유지한다.
