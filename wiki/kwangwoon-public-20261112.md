# 광운대학교 자연·수리 운영 공개 · 2026-11-12

상태: 적용 전 검증 완료. **실제 운영 결과는 후속 절에서 확정**한다. 대상21시험42문항. 다음서울여대,이번범위외착수0. 동국7시험20 PUBLISHED/2026모의Q1 HOLD를Owner확인으로인수한다.

## 기존 자료 재사용 및 공개 범위

2021–2026수시14시험,2021–2027모의7시험. 기존Registry42 ID·문항단위·평가기준·Math package·Worker자료SHA를 그대로사용한다. 기존TECH DB849/WEB86/APP43·Python26검증기록을재사용하며새평가엔진/AI품질판정없음.

[정확ID/SQL SHA](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/scope.json),[문항별원본지면계획](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/natural_tech_ready_20261112/kwangwoon-source-plan.json).

- 신규636행=Math8테이블594+기존privateWorker42,168상태ACTIVE.기존두내부Math함수의허용목록340→382.서명/owner/ACL·Credit/Provider변경0.
- 기존학생목록17시험중대상1시험만표시되고20시험은기존숨김목록에존재. `essay_browse_catalog(text)`의정확20시험만제외목록에서해제,다른16숨김시험보존. 새RPC0. 전체광운37시험,대상자연21시험42문항.
- 공식원본에서문제영역만분리한기존후보PDF21파일78쪽재사용. 기존원본SHA·후보SHA·픽셀계약·숨김텍스트/주석없음확인,전체렌더육안확인.2021수시2교시Q1연속지면/Q2시작쪽,2022모의Q2펼침면검수결과유지.문제·수식·기준내용편집0.
- 원본본문검색에서명시적상업/복제/재배포금지문구발견0. 새법률판단/이용허락취득을뜻하지않는다. 이번Owner의공식PDF연결·검증문항공개지시로정확42메타데이터승인.성균관RIGHTS_HOLD등다른보류해제0.
- 신규21SHA파일만 private essay-material-originals에추가,authenticated+기존 account_service_allowed() 최소SELECT정책1개.익명/탈퇴대기/삭제중/없는계정/다른파일차단,기존271정책보존. [PDF지문·매핑](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/kwangwoon_public_20261112/pdf-audit.json).

## 사전 검증 및 원복

운영사전158검사PASS. 격리PG17에서42문항제출/멱등성/MockWorker결과/타계정차단/재작성/재첨삭·롤백PASS,연결126검사PASS. Storage6상태·다른파일차단·정책원복·객체보존PASS.목록42대학×anon/authenticated 적용/원복PASS,다른41대학반환값보존·중복적용거부PASS. WEB410 PASS/1SKIP,타입/Next/Functions빌드PASS. APP결과는후속영수증참조.

공개적용순서: PDF업로드/다운로드SHA→최소파일정책/권한확인→최신사전SELECT→636행원자적연결→168상태/2허용목록→20시험숨김해제→논술범위보존배포→실제API/계정역할확인. 각SQL은사전지문·사후가드·원자적보존검증을포함한다.

장애시신규WEB범위회수→rollback-admission.sql로42leaf진입차단→browse-rollback.sql로새20시험만숨김→필요시신규PDF읽기정책회수.사용자답안/결과/PDF/적재자료삭제없음.드리프트시가드중단. 운영롤백0.

## 보존 및 검증 경계

기존원본/Registry/시행학년도·문항ID/평가버전/사용자lineage유지,추가자료연결시점분리.현재UPDATE로과거학습기록덮어쓰기없음.기존auth identity·접근목적·retention·Credit의미불변.공식근거·학생학습사실·Mock결과·모델판단을합치지않는다.개인정보신규수집0,권한확대는승인된공식문제파일로만한정. [기존보존전략](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/wiki/longitudinal-learning-admissions-data-strategy.md)계승.

실제Provider0·운영검수답안0. 로그인브라우저/실기기/AI품질미실행은NOT TESTED로표시. Owner로그인·AI품질검수를작업진행조건으로요청하지않는다. 동국Q1·숭실Q2·항공5·중앙과학11·성균관15HOLD보존. 전체10대학완료아님.
