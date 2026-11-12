# 서울여자대학교 자연계열 공개 연결 — 2026-11-12

상태: 운영 적용 전 검증 완료. 최종 적용 결과는 후속 기록을 따른다.

광운대 21시험·42문항 공개 완료, 신규 HOLD 0 및 기존 데이터·권한·Credit 보존을 Owner가 확인했다. 광운대는 DONE이다. 이번 서울여대 범위는 4시험·9문항 중 **2026 수리 1시험·3문항** 공개이며, **2023–2025 과학 3시험·6문항**은 NOT READY로 분리한다.

## 재사용·변경 범위

기존 Registry ID와 공식 자료·평가 기준·Math package·Worker 원본을 재사용한다. [정확한 대상과 SQL SHA](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/swu_public_20261112/scope.json), [기존 기술 검증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/natural_tech_ready_20261112/seoul-women-receipt.json)을 참조한다.

- Math 8테이블 33행 + 기존 private Worker 자료 3행 = 신규 36행. 기존 4개 상태 테이블의 12행만 ACTIVE로 연결한다.
- 기존 내부 함수 `evaluation_admission()`·`release_catalog(uuid)`의 허용 목록에 정확한 3문항을 추가한다. 신규 RPC·평가 엔진·Credit/Provider 정책 변경은 없다.
- 기존 학생용 승인 PDF 1파일·1쪽에 Q1–Q3이 모두 있다. 운영에서 다운로드한 SHA와 기존 승인 매핑을 확인했다. 새 PDF 업로드·Storage 정책 변경은 없다.
- 서울여대 11개 전체 시험 목록과 대상 4개 자연계열 시험은 이미 조회된다. 목록 노출과 첨삭 가능 상태는 다르다. 목록 RPC는 변경하지 않는다.
- WEB의 기존 공개 범위만 시험 329→330, 확장 시험 159→160, Math 문항 382→385로 늘린다. 기존 비논술 2,186자산·API·Secrets·Preview·라우팅을 보존하는 계획을 검증했다.

## 과학 6문항의 미준비 사유

공식 문제·출제 의도·평가 기준·예시 답안은 모두 확보돼 있다. 원본 5파일의 SHA와 참조 쪽수를 확인하고 과학 6문항의 평가 기준 7쪽을 다시 열람했다. 2023 Q2 예시 답안은 원본 이미지에 있으며 텍스트 추출 부재를 자료 누락으로 보지 않는다.

현재 `science.ts`는 검수된 criterion/evidence 바인딩을 요구하는 후보 모듈이며 실제 서비스 호출부가 없다. `composition.ts`도 canonical persistence의 ready 조건을 요구한다. 이 6문항의 검수된 과학 바인딩, 기존 Worker 전달, 원자적 결과 저장·재첨삭 연결이 운영에 준비돼 있지 않다. 운영 Math/Worker 연결은 0개다. 수학 계약으로 우회하거나 평가 기준을 생성하지 않았다.

기존 목록에서 시험 정보가 보이는 사실은 첨삭 공개 완료를 뜻하지 않는다. [문항별 공식 지면과 차단 사유](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/swu_public_20261112/science-not-ready.json)를 별도 보존한다.

## 검증

격리 PG17에서 정확한 36행 적용·3문항 제출·멱등성·Mock Worker 결과·타계정 차단·재작성·재첨삭·원복을 검증했다. 활성화 9검사 PASS, 원복 후 기존 결과·사용자 이력 보존 및 신규 평가 차단 PASS다.

관련 WEB 447 PASS / 1 SKIP, APP 29 PASS, 타입·ESLint·Next/Functions 빌드 PASS. WEB 전체는 1,957 PASS / 5 SKIP / 10 FAIL 및 예외 1건이다. 변경 전 HEAD의 임시 스냅샷에서도 정확히 같은 실패 10건·예외 1건을 재현했다. 종료된 베타 안내 4건, 관리자 분석 문구 2건, 관리자 화면 기대값·fixture 4건이며 이번 연결의 신규 실패는 0건이다. 범위 밖 기능을 수정하지 않았다. [테스트 기록](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/swu_public_20261112/test-results.json).

실제 Provider 호출·AI 품질 판정은 0회다. 로그인 후 제출·결과·재첨삭, iPhone·Android 실기기는 NOT TESTED다. Owner의 AI 품질 검수는 전체 결과 통합 정리 후 진행한다.

## 보존 검토 7항·복구

1. 새 사실은 기존 공식 문항의 연결·공개 시점이다. 시행 학년도와 구분해 기록한다.
2. 원본 PDF SHA, Registry ID, 문항·평가 버전과 기존 원본을 유지한다.
3. 기존 사용자 답안·평가·학습 이력을 UPDATE하거나 삭제하지 않는다. 새 자료와 정확한 공개 허용 범위만 추가한다.
4. 기존 auth identity와 사용자별 권한을 유지한다.
5. 공식 근거, 사용자 Learning 이력, Mock 결과와 실제 AI 판단을 구분한다.
6. 개인정보 신규 수집·목적·보관 기간·검수 계정 특권 변경은 없다. 기존 RLS 272개와 권한을 보존한다.
7. 생성한 평가 기준이나 추정치를 공식 사실로 저장하지 않는다. 공식 근거와 연결 검증의 한계를 남긴다.

문제 발생 시 새 WEB 공개 범위와 Math 3문항 허용 목록만 이전 상태로 돌린다. 공식 자료·사용자 답안·결과·Credit 이력은 보존한다. 함수·배포 지문이 달라지면 자동 원복을 중단한다. 기존 광운대 및 다른 대학 공개와 HOLD는 유지한다.
