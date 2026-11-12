# 서강대 자연·수리 9시험·11문항 운영 공개 · 2026-11-12

상태: **PUBLISHED — 아래 운영 적용 확정 참조**. Owner의 서강대 공개 지시 범위이며 AI 첨삭 품질 검수는 전체 대학 이후 Owner가 수행한다. Provider 호출0.

## 선행 대학 결정

건국 신규24 공개 완료/기존4 보존. 경희 신규7 공개 완료/기존3 보존/NOT READY16 제외/브라우저 UI NOT TESTED. 성균관15 RIGHTS_HOLD 유지, 기존 이용허락 근거 없음 및 원문 조건은 [별도 기록](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/wiki/essay-sungkyunkwan-rights-hold-20261112.md). 기술 후보는 보존하고 서강대로 진행한다. 기존 완료 대학 재작업 없음.

## 변경 범위와 공식 PDF 보완

서강 기존9시험11 Registry ID 그대로, 신규150행(기존 Math8테이블139행+private Worker11행),44개 상태 ACTIVE. 기존2함수의 허용목록에11leaf만 추가하며 엔진·RPC 시그니처·권한·Credit 정책 불변. [문항/시험/leaf 정확 목록](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sogang_public_20261112/scope.json).

2026 자연2차 Q2(cf5f3f9a-66e1-5e52-881a-6dad8ed84eb8) 기존3페이지 PDF는 Q2-4 마지막 조건이 누락됨. 운영 파일 SHA da2dabb259b03f409743ff6a9bd6dfc4dc190f58d57759895027c87c7f5c21dd와 동일함을 확인했다. 기존 공식 원문 SHA 8aeef5e82c2520b9060dae037c5eb8a24fecb9893b392a99eab7c56c2c93fce8의 physical1,2상단,6,7상단을 재사용한 기존 후보를 검증했다. 교정본 SHA **2bbadaf676cb022a98e4b81ea527332940b7862a95d95c38ff392c665ef8bc5a**,349986bytes,4페이지. Q1시작1/Q2시작3. 문제 지문 변경 없음, 출제의도 아래 해설 미포함, 원문과4영역 픽셀 일치 및 숨은 해설 텍스트 없음. [영수증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sogang_public_20261112/pdf-pixel-verification.json).

신규파일만 업로드하며 기존파일/정책 보존. private bucket `essay-material-originals`의 정확 새파일1개에만 authenticated SELECT+기존 account_service_allowed() 조건을 추가한다. 기존269개 정책을 변경하지 않는다. 문제/평가기준/Worker 원본 보존. WEB/APP 동일 서버 PDF 메타데이터에서 해당시험2문항만 교정본으로 바꾼다. APP 신규배포 불필요.

## 검증

- 운영 사전 SELECT127 PASS, 신규150행 부재·Registry92개 정합·기존7연결 및 함수/권한 확인.
- 격리 PG17:11문항 모두 제출/멱등성/Worker claim/Mock finalize/결과/타계정 차단/재작성/재첨삭/원복 통과.33공개 연결 검사 PASS. 실제AI 품질 검증 아님.
- 격리 Storage:정상1허용,탈퇴대기/삭제중/없는계정/uid없음/anon 차단,다른파일/버킷 차단,원복 후 접근0/객체 보존.
- WEB414 PASS/1 SKIP, typecheck 및 정적 build/Functions build PASS. 기존 PDF 테스트 집계가 HEAD의1005/990/353보다 오래된894/879/312를 참조해 실패하던 부분을 현재 실제 집계로 수정했고 원소별 검증은 유지.
- APP 교정PDF 및 메타데이터 테스트5 PASS. 일반 브라우저·실기기 UI는 NOT TESTED, Owner 로그인/품질 테스트를 작업 조건으로 요구하지 않음.
- WEB 기존비논술 자산2169개 보존,3개 plaintext 공개범위만9시험/11leaf 확장. 기존Secrets/Preview/라우팅/API 소스 불변.

## 실행·검증·복구

1. 새PDF 업로드 후 원격재다운로드 SHA 확인,파일1개 읽기정책 적용/검증.
2. 최신 운영SELECT 및20보존스냅샷 재확인. 정확SQL 원자적150행 적재→검증→44상태/2허용목록 활성화→33검증. 실패 시 트랜잭션 원복.
3. 보존 배포기로 논술경로만 공개. 공식PDF/일반계정DBROLE catalog/input/기존결과·재첨삭 계약 확인. 사용자 답안·결과·Credit 기록을 만들거나 변경하지 않음.
4. 문제가 있으면 새WEB범위 닫기→검증된 rollback-admission.sql로11leaf만차단. 기존답안/결과/자료는 보존. 새PDF 정책만회수하는 rollback-storage.sql 준비. 기존PDF삭제/덮어쓰기 없음. 운영드리프트시 자동원복 중단 후 범위 재평가.

운영 적용 결과는 아래 확정 기록을 따른다. 전체10대학 완료가 아니다. 다음 순서 숭실→숙명여대→동국→광운→서울여대, 한국항공7DRAFT 별도공개 잔여/HOLD5 및 중앙과학11HOLD 유지.

## 운영 적용 확정 — PUBLISHED

완료 확인 **2026-11-12 12:43 KST**. 서강대 **9시험11문항 운영 연결/공개11, 미공개0**. Owner 승인 범위 내에서 전체 대상만 공개했다. 공식원문 재다운로드는 입학처 응답 불가로 성공 주장하지 않으며, 기존 보관 공식자료 SHA/물리페이지/픽셀 대조로 Q2 누락을 해결했다.

|항목|실제 결과|
|---|---|
|DB 연결|150행 신규,44개 ACTIVE,기존2함수 허용목록만11leaf 추가|
|Migration|20261112034047_sogang_complete_q2_pdf_read / 20261112034210_sogang_11_math_public_release|
|원본/문제PDF|기존8파일 원격SHA PASS,교정1파일 원격SHA PASS,기존3페이지 파일 보존|
|일반사용자 권한|authenticated 실제계정 역할에서 전체257/new11 catalog 및 기존 history 조회 PASS. anon 차단,탈퇴대기3 차단. 삭제중은 실제대상 없어서 격리검증 PASS/운영 실제계정 NOT TESTED|
|정책 보존|기존269개 RLS 정책 내용 일치;정확한 새PDF1개 SELECT 정책만 추가|
|기존 데이터|DRAFT전후20개 보존집계 일치;활성화후2허용목록 외19집계 일치. 나머지 함수/변경함수ACL은 원자적SQL 내부에서 보존 확인|
|공개 WEB|0e5f4280-19b1-4660-b75f-d2d6f39a3fa4,배포소스6bf20e66eacbe16eedfe8a4dd19672bb4d2c2c6a|
|공개 조회|/essay-lab 및/catalog HTTP200,서강9시험11Registry ID 일치. /student-pdfs 비로그인401 정상|
|기존 서비스|비논술2169자산 동일,기존Secrets/Preview/Functions 라우팅 동일. 공개범위3개만 확장|
|제출·결과·재첨삭|11개 모두 격리 실제DB RPC+Mock Worker 계약 PASS. 운영 사용자 답안/첨삭/Credit 생성·변경0,Provider 호출0|
|UI|실제 브라우저 및 iPhone/Android NOT TESTED. 공개 결과를 실제AI 품질 검수로 해석하지 않음|
|회귀|WEB414 PASS/1 SKIP,타입/린트/build/Functions PASS. APP PDF5+기존흐름25 PASS/4 SKIP|
|복구|신규 공개 범위 회수→허용목록11개 원복→필요시 새PDF정책만 회수. 기존답안/결과/파일 보존. 실행 필요 없어 미실행|

[DB 적용 영수증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sogang_public_20261112/production-receipt.json), [배포/HTTP 영수증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sogang_public_20261112/web-production-receipt.json), [Storage 권한 결과](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sogang_public_20261112/storage-production-verification.json), [테스트 결과](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sogang_public_20261112/checks-summary.json).

Git: WEB 공개소스6bf20e6, APP SQL/사전기록084129f. 후속 기록 커밋은 이 문서의 Git log에 남긴다. 성균관15 RIGHTS_HOLD는 유지,이용허락 확보 후만재개. 다음 대학은숭실대. 전체10개대학 완료아님.
