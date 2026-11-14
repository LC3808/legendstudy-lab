# 관리자 운영 콘솔 PHASE 2 — 2026-11-14

상태: WEB/SQL 운영 적용 DONE. 실제 피드백 사례 왕복·Flutter 기기 검증은 NOT TESTED. 기존 [P0 구현](admin-lab-operations-20261114.md)은 재개발하지 않았다.

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

브라우저 검증에서 구버전 /my/essays의 클라이언트 이동이 이전 결과 renderer를 유지하는 것을 발견했다. 직접 결과 로드는 코멘트 폼 정상. 기록→결과 이동을 보장하기 위해 배포 허용 범위를 /my/essays 하위로 일치시켰다. 그 외 학생/공개 자산 보존은 유지한다.


## 최종 배포 및 실제 브라우저 검증

- 최종 Pages: `9229b2c9-031b-4a4b-b128-8b3763a86d4f`, 배포 소스 `6c3df3f4d8c67fae8f2f84392bd5d9aa6f67f90d` (기능 구현 4fc8b57 + 기록/결과 자산 일치 보완).
- 첫 PHASE 2 배포516db0f0에서 관리자 및 결과 화면 반영. 후속은 기록 화면5자산만 추가 교체. 두 배포 모두 기존 API worker SHA256 `a6d8dd9b1ee386cb672c7a002c3946b9e0d616120dc7a43057b7cd3e80fee98b`, 환경 설정·Functions routing 보존.
- 원격 작업 브랜치 `codex/lab-admin-operations-20261114`로 push. Force push 없음. 이 문서의 마지막 기록 커밋은 배포 소스 이후 docs-only다.

| 검증 | 실제 브라우저 | 자동화/DB | 상태 |
|---|---|---|---|
| A 7개 메뉴 영역 | 7개 그룹 및 기존 링크 확인 | 메뉴/라우트 회귀 PASS | DONE |
| B 기존 URL | admin·credit·essay-runs·operations·essay-feedback·ql·my/essays·result 확인 | 정적 빌드/메뉴 링크 PASS, 나머지 전수 로그인 조회 미실행 | PARTIAL |
| C 권한 분리 | 현재 로그인 관리자 겸 검수자 통과. 별도 일반관리자 세션은 미실행 | quality 게이트 회귀 PASS, 운영 일반회원 admin RPC 거부/anon·service 실행권한 없음 | PARTIAL |
| D 이용권→회원→첨삭→품질 | 성균관대 베타 회원 UUID로 검색, 1/1 완료, 3/3 결과, 문제3 품질 화면까지 PASS | 기존 읽기 계약/정확ID 링크 PASS | DONE |
| E 피드백→첨삭→품질 | 실제 피드백0건: 사례 왕복 NOT TESTED. 관리자 조회 정상0건 확인 | 합성 UI 링크·소유권/참조·운영 rollback 계약 PASS | PARTIAL |
| F 성균관대 실결과 | 실제3문항 답안·AI 결과 및 당시 material 기준/근거 버전 확인. 품질 기록 저장 안함 | 회차/원장 해시 동일 | DONE |
| G 학생 코멘트 | 본인 기록→결과→문항별 첨삭 탭에서 코멘트 폼 확인. 영속 제출 클릭 안함 | 운영 본인 회차 submit→조회→처리 후 rollback PASS | PARTIAL |
| H 경고 상세 이동 | 현재 처리중1→한양대 오래된 미완료1 조회. 실패0/재시도1/신규피드백0 표시 확인 | 집계/미확인과0구분 PASS | DONE(지원 지표) |
| I 기존 검색/정렬/페이지 | 이용권 UUID검색/최근요청순, 베타 필터→검수→뒤로가기에서 source=beta·선택회차 복원 PASS. 다중페이지 클릭은 이번 브라우저에서 미실행 | 서버25페이지/필터/기간/역할, 기존 정렬 회귀 PASS | PARTIAL |
| J 기존 기록 보존 | 읽기 조회만 수행, 지급/재처리/검수저장 안함 | runs·credit_transactions 전체 해시 적용 전/최종 동일. SQL은 기존 답안/결과/결제/검수 수정문 없음 | DONE |

최종 기준 데이터: runs 해시 `aff110441e9f941164e70694e2ad1d49`, ledger 해시 `b62e38bbaa1d4999ce716e91d16e7dfa`; 테스트 후 essay_context0/quality_judgments0. 실제 사용자 텍스트·이메일·원본 답안은 Wiki에 보관하지 않았다.

제한: USER_REPORT 회차 저장계약 확장은 하지 않음. 장시간·결과누락·차감이상 통합 경고는 PARTIAL이며 기존 상세 진단으로 확인. Flutter 배포/기기, 별도 일반관리자 브라우저 세션, 실제 학생 피드백 사례 왕복 및 영속 제출은 NOT TESTED. DB 계약 검증을 브라우저 제출 완료로 간주하지 않는다.
