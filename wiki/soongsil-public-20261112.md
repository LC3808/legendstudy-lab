# 숭실대학교 자연·수리 운영 공개 · 2026-11-12

상태: 적용 전 검증 PASS. 아직 PUBLISHED가 아니며 실제 운영 결과는 후속 기록에서 확정한다. 서강9시험11문항은 Owner 확인에 따라 **DONE**. 다음 대학은 숙명여대. AI 품질은 전체 대학 후 Owner 검수, Provider 호출0.

## 범위

기존5시험20문항 중 **19문항 공개 대상**, 공식자료 HOLD1 유지. 기존16 TECH READY에 2024자연 Q1/Q3/Q4 부분 연결3을 보완한다. 경희대의 기존 `catalogQuestionIds` 구조를 그대로 재사용한다. 원본 Registry4문항은 유지하고 공개·제출 허용목록만3개로 제한한다. 엔진·새RPC·Storage정책 변경 없음.

신규237행(Math8테이블218행+Worker19행),76개 ACTIVE,기존2함수의 leaf 허용목록19개 추가. 기존 Registry ID와 소스파일·평가기준·Worker 자료 해시 재사용. 원래20문항250행 SQL은 실행하지 않는다. 정확 목록은 [scope](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/soongsil_public_20261112/scope.json), [WEB 부분 공개 범위](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/soongsil_public_20261112/web-scope.json).

## HOLD 사유 및 해제 조건

2024자연 Q2 `815bc344-cdbb-5b7f-82c1-dc528de46f51`: 공식 문제PDF 물리3쪽 25점, 해설PDF 물리4쪽(인쇄40쪽) 기준 (1)25점+(2)15점. 임의 재계산·문제/해설 수정 금지. 해당 문항의 정확한 배점·평가기준을 확정할 공식 정정 또는 Owner가 검토한 공식 근거가 필요하다. 해당 Math/Worker 미적재,평가 허용목록 제외. 이미 승인된 기존 시험 전체 문제PDF는 그대로이며 Q2 원문도 포함한다. 이번 작업이 Q2의 첨삭 공개를 의미하지 않는다.

## 적용 전 검증

- 운영 사전136검사 PASS,기존20개 데이터·함수·RLS·권한 스냅샷 확보.
- 격리 PG17:19문항의 제출/멱등성/Worker claim/Mock 결과/타계정 차단/재작성/재첨삭 PASS.57연결검사 PASS. 비파괴 허용목록 원복 후 기존 결과·답안·Credit 보존 및 신규평가 차단 PASS.
- WEB416 PASS/1 SKIP,타입/린트/정적빌드/Functions PASS. 2024부분3 활성화와 HOLD Q2 제외,Registry 불일치시 차단 검사 포함.
- APP34 PASS/4 SKIP. 기존 문항 선택/PDF/제출/결과/재작성 경로 재사용. APP 배포 없음.
- 기존 승인PDF5개 원격SHA·페이지 수 일치,21쪽 렌더 확인. 업로드/메타데이터/Storage정책 변경0. 일반계정5파일 조회,anon0.
- WEB 기존 비논술2172자산 및 인증·결제·비밀변수·Preview 설정 보존,공개범위3변수만5시험19leaf 확장 계획.
- 브라우저/실기기 UI는 아직 NOT TESTED. Owner 로그인이나 AI검수를 착수 조건으로 요구하지 않는다.

## 적용 및 복구

공개 지시 범위 안에서 최신 사전검사→237행 원자적적재→사후검사→76상태/기존2허용목록→57검사→보존WEB배포→운영조회검증 순서. 실패 시 해당트랜잭션 원복. 공개 후 장애는 새WEB범위 닫기 후 `rollback-admission.sql`로19leaf만 회수한다. 기존사용자 답안·평가·Credit·기존공개목록 보존. 원복SQL은 운영함수 해시가 달라지면 중단한다.

성균관15 RIGHTS_HOLD,한국항공HOLD5,중앙과학HOLD11 유지. 전체10대학 완료가 아니다.
