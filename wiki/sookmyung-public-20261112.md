# 숙명여자대학교 자연·수리 운영 공개 · 2026-11-12

상태: **PUBLISHED — 신규16시험44문항 운영 연결·공개 완료**, 기존6문항 보존. 아래 적용 전 항목은 사전검증 기록이며 최종 결과는 후속 절에 기록한다. 숭실5시험19문항은 Owner 확인에 따라 DONE,2024자연Q2 HOLD1 유지. 다음 대학은 동국대. Provider0,AI품질은 전체대학 이후 Owner 검수.

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

## 최종 운영 결과 — PUBLISHED / 2026-11-12

신규 **16시험·44문항·702행** 운영 연결 및 사용자 공개 완료. 기존 운영 Math 6문항은 정확히 보존했다. 이번 숙명여대 대상의 미공개/HOLD는 0문항이다. 인문계열 등 기존 목록도 보존했다. 전체 10개 대학 완료 또는 AI 품질 검수 완료를 의미하지 않는다.

- Storage migration `20261112042509_sookmyung_14_official_problem_pdfs_read`: 공식 문제 원본14파일/46쪽, 정확파일 읽기정책1. 기존270 RLS정책 불변. 정상계정14파일 허용, anon0, 탈퇴대기3계정 각0. 삭제중 계정은 격리 PASS, 운영 해당계정 없음으로 NOT TESTED.
- Math migration `20261112042841_sookmyung_44_math_public_release`: 176상태 ACTIVE 및 기존2함수 허용목록44leaf 추가. 사전160·적재후203·활성화132검사 PASS. 단계별20보존그룹과 활성화후19불변그룹 확인.
- 목록 migration `20261112043605_sookmyung_44_browse_public_release`: 기존 `essay_browse_catalog(text)` 숨김50시험 중 승인된 숙명14시험만 해제, 나머지36시험 유지. 신규 RPC 생성/시그니처/ACL/owner 변경 없음. 이 단계까지 합해 **기존 함수 본문3개**의 공개목록만 변경했다.
- WEB deployment `67544a80-ce5e-41d5-a2f1-f6714bcc7a45`, 배포 소스 `cf59c6207cdcd287993aa7949aa3e74d341670cf`. 공개범위301시험/확장131시험/Math320leaf. 비논술2175자산·기존Secrets/Preview·라우팅 보존. API 소스·기존 엔진·Credit 정책 불변.

### 실제 화면에서 발견한 목록 누락과 해결

초기 Math·공개 API 검사는 통과했지만, 브라우저는 기존 목록 RPC의 숨김 정책 때문에 숙명8시험만 표시했다. SourceExamSelection의 기존 목록 우선 처리가 관찰 경로였으며 **근본 원인은 RPC의 기존 숨김 목록14시험**이었다. UI 코드를 변경하거나 다른 API로 우회하지 않고 승인된14시험만 숨김 목록에서 해제했다. 처음 보였던8시험은 모두 그대로 보존되어 최종22시험(자연18+인문4)이 표시된다. 자연18시험 중 이번신규16시험44문항, 기존2시험6문항이다.

격리 PG17에서42개 대학·anon/authenticated 적용/롤백·중복적용 거부 PASS. 운영에서도 같은42대학 비교로 다른41대학 반환값 정확히 동일, 기존 숙명8시험 정확히 동일, 신규16시험44문항 확인. 함수 ACL/owner, 나머지함수,19개 데이터/RLS지문 보존. 운영롤백은 실행하지 않았다.

### 검증과 한계

- WEB **416 PASS / 1 SKIP**, APP **35 PASS / 4 SKIP**. 타입검사·ESLint·Next 정적빌드·Functions빌드 PASS.
- 격리 기존 Worker:44문항 제출·멱등성·Mock 결과·타계정 차단·재작성·재첨삭 PASS. 실제 Provider0회, 운영 시험답안 생성0건.
- 운영 일반계정 권한: `math_catalog` 신규44/총320 조회, 기존6문항 동일, 기록조회 PASS. 실제 Auth 세션으로 브라우저 제출한 결과는 아니다.
- 비로그인 브라우저: 대학검색→숙명→2021–2027 시험목록→자연계열2026모의 선택→문항1–3/사진·수식 입력란/PDF메타데이터 표시 확인. 비로그인 첫 대학목록의 서비스확인 버튼은 기존 인증필수 경로라 오류안내가 표시됐다. 대학명 링크로 정상 진입했다. 로그인 후 PDF 실제 렌더·저장·제출/결과UI는 **NOT TESTED**. iPhone/Android 실기기도 **NOT TESTED**. Owner에게 로그인을 다시 요청하지 않았다.
- PDF 원본14업로드/재다운로드 SHA 일치, 기존PDF2파일 SHA 동일. 수식·도형은 원문 전체페이지 그대로 보존. AI 첨삭 품질은 전체 대학 연결 후 Owner 통합 검수.

### 실행 오류와 복구 기록

첫 활성화 요청은 도구 출력에서 대용량 SQL 일부가 잘려 JSON오류가 발생했고 전체 트랜잭션이 원복됐다. 203사후검사로 DRAFT·기존 데이터/권한 보존을 확인했다. 완전한 원본 재전송은 API요청크기 제한으로 거절됐다. 이후 SHA 고정 원본1,750,745바이트를 TLS PostgreSQL로 실행하고 migration이력을 같은 트랜잭션에 기록해 성공했다. SQL 내용 변경이나 일부만 적용하는 우회는 없었다. Cloudflare 최초조회401은 운영변경 전에 발생했고 기존 OAuth갱신 후 배포 성공했다.

### 비파괴 롤백

신규 WEB 공개범위를 먼저 닫고 `rollback-admission.sql`로 신규44leaf의 첨삭 진입을 차단한다. `browse-rollback.sql`은 함수지문이 일치할 때 신규14시험만 다시 숨긴다. 필요시 `rollback-storage.sql`로 새14파일 읽기정책만 회수한다. 기존6문항·사용자 답안/평가/Credit·업로드 원본은 삭제하지 않는다. 이후 다른 공개작업으로 함수지문이 변했으면 자동 원복하지 않고 범위를 다시 대조한다. 각 단계별 원복은 격리 PASS, 운영 실행0회.

### 인수 및 다음 순서

숭실5시험19문항 DONE,2024자연Q2 공식배점 불일치 HOLD1 유지. 성균관PDF RIGHTS_HOLD,한국항공5HOLD,중앙대과학11HOLD 유지. 다음 대학은 **동국대학교**이며 이 기록에서는 착수하지 않았다.

Git: WEB 배포소스 `cf59c6207cdcd287993aa7949aa3e74d341670cf`, APP 사전검증 `d114d23`. 최종 증빙·Wiki 커밋은 이 문서를 포함하는 Git 커밋 및 완료 보고 HEAD를 참조한다.

[최종 영수증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sookmyung_public_20261112/final-release.json) · [운영 목록 검증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sookmyung_public_20261112/browse-production-verification.json) · [WEB 공개 검증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sookmyung_public_20261112/web-production-receipt.json) · [목록 적용 SQL](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sookmyung_public_20261112/browse-open.sql) · [목록 롤백](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/sookmyung_public_20261112/browse-rollback.sql).

최종 APP/SQL 증빙 커밋: `bb0e4eeda24862b67b374dee6acd8a350bbc5f17`. 최종 목록 검증 SQL도 운영 SELECT에서 PASS했다.

Owner 후속 확인: 숙명16시험44문항 **DONE**, 기존6문항·사용자기록 보존. 다음 동국 운영 연결·공개 승인.
