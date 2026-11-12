# 숙명여자대학교 자연·수리 운영 공개 · 2026-11-12

상태: 운영 적용 전 검증 PASS. 실제 PUBLISHED 결과는 후속 기록에서 확정한다. 숭실5시험19문항은 Owner 확인에 따라 DONE,2024자연Q2 HOLD1 유지. 다음 대학은 동국대. Provider0,AI품질은 전체대학 이후 Owner 검수.

## 대상과 보존

기존 운영2026수시 일반/약학6문항은 제외·보존. 신규16시험44문항은 기존 Registry ID와 답안 단위를 그대로 사용한다. 2021묶음문항을 임의 분할하지 않는다. 신규702행=Math8테이블658행+privateWorker44행,176개 상태ACTIVE,기존2함수의 공개허용목록44leaf 추가. 기존 첨삭 엔진·RPC 시그니처·계정권한·Credit 변경 없음.

[정확 시험/문항/leaf 목록](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sookmyung_public_20261112/scope.json), [WEB 범위](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sookmyung_public_20261112/web-scope.json).

## 공식 PDF

기존44후보의 PDF6문항 메타데이터는 그대로 보존. 신규38문항은 해설과 분리된 **공식 문제 원본14파일**을 바이트 그대로 사용한다. 원본 SHA와 페이지수를 검증하고 전체지면을 렌더 확인했다. 기존 재렌더링 후보의 픽셀비교가 일치하지 않아 해당후보를 새공개파일로 사용하지 않으며,후보의 픽셀동일성을 주장하지 않는다. 문제·배점·해설을 편집한 것이 아니다.

2023모의 Q2는 원본2–3쪽,Q3는 원본3쪽 공유. 중복페이지를 새로 만들지 않고 Q3시작쪽3으로 연결한다. 2024수시/모의 Q2=2–3쪽,Q3=4–5쪽 보존. 기존 공식파일32개의 본문에서 명시적 상업/복제/재배포 제한 문구를 찾지 못했으며 이는 법률 판단이나 추가 이용허락 취득을 의미하지 않는다. 기존 자료 재사용 및 공개에 대한 이번 Owner 지시 범위로 처리한다. 성균관 등 별도 RIGHTS_HOLD는 유지한다.

신규14개 파일은 private `essay-material-originals` bucket의 SHA.pdf로만 업로드. 정확14파일 authenticated SELECT+기존account_service_allowed() 정책1개를 추가한다. anon/탈퇴대기/삭제중/없는계정은 차단. 기존270정책 불변. 원복은 새정책만 회수하며 파일과 사용자 이력을 삭제하지 않는다.

[공식 원본/시작쪽 확인](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sookmyung_public_20261112/pdf-audit.json), [읽기정책](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sookmyung_public_20261112/storage-policy.sql).

## 적용 전 검증

- 운영 사전160검사 PASS. 신규702행 부재,기존Registry/권한/함수 일치.
- 격리 PG17:44문항 제출/멱등성/Mock Worker결과/타계정차단/재작성/재첨삭 PASS.132연결검사,기존기록·공개목록 보존 롤백 PASS.
- 격리 Storage:14파일 전부 정상계정허용,다른파일·버킷/anon/탈퇴대기/삭제중/없는계정 차단. 원복후 접근0/객체보존.
- WEB416 PASS/1 SKIP,타입/정적build/Functions PASS. APP 신규38 원본SHA·공유페이지 및 기존흐름 회귀 실행.
- WEB 비논술2175정적자산 보존,3plaintext 공개범위만16시험44leaf 확장. 기존Secrets/Preview/라우팅/API소스 불변.

## 적용 순서와 복구

원본14 업로드/재다운로드SHA검사→정확파일정책 적용/권한검증→최신사전SELECT→702행 원자적적재/보존검증→176상태와2허용목록 활성화/132검사→WEB보존배포→실제공개/API/일반계정조회 검증. 실패시 해당트랜잭션 원복. 공개후 장애는 신규WEB범위 닫기→rollback-admission으로44leaf만 차단→필요시 신규PDF정책 회수. 기존답안/평가/Credit·기존6문항·PDF는 보존한다. 운영드리프트시 원복가드가 중단한다.

로그인한 브라우저·실기기/AI품질은 확인하지 않은 항목을 완료로 표기하지 않는다. 사용자에게 로그인·AI품질 검수를 선행조건으로 요구하지 않는다. 전체10대학 완료가 아니다.
