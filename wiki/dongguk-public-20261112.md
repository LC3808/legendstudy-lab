# 동국대학교 자연·수리 운영 공개 · 2026-11-12

후속 현황: [잔여51 처리·동국Q1 정정공개·전체178/43](remaining-51-ewha-20261112.md). 아래 수치는 해당 최초 적용 당시의 이력이다.

상태: **20 PUBLISHED / 1 HOLD — PARTIAL**. 적용 완료 결과는 후속 절을 참조한다. 대상7시험21문항 중 **20문항 공개 연결, 2026모의Q1은 공식 수정본 불일치 HOLD**로 범위를 한정한다. 숙명16시험44문항은 Owner 확인 DONE, 기존6 보존. 다음 대학은 광운대.

## 범위·공식 자료

[정확7시험/20문항/leaf 및 SQL SHA](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/scope.json). 기존 Registry ID 유지.2022/23/24모의의 hash형 Source ID는 기존3개를 대조해 재사용하며 새별칭·중복시험을 만들지 않는다. Math8테이블253행+기존privateWorker자료20행=273행.4개 상태테이블80행 ACTIVE, 기존 math_private.release_catalog(uuid)/evaluation_admission()의 허용목록만320→340leaf. 새RPC·엔진·Credit·계정권한 변경 없음.

기존 승인 PDF7파일·21문항 메타데이터를 그대로 사용한다. 운영 파일 재다운로드 SHA/35쪽/시작쪽 확인, 전지면 렌더 확인.2022모의Q2의 이어지는 표,2024모의Q3의 그래프·도형과 추가지문,2025수시Q2의 공식 정정문,2026수시Q1의 입체도형을 보존한다.2025/26수시 원문에는 서면허락 없는 출판·게재·사용 제한이 있다. 기존 studentDisplay/storageRead APPROVED 및 기존 운영 읽기정책과 Owner의 재사용 지시를 이어받은 것으로, 새 이용허락을 취득했다고 보고하지 않는다. 파일·메타데이터·Storage정책 추가/수정0. 별도 성균관 RIGHTS_HOLD는 유지한다.

[PDF SHA 및 페이지수](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/existing-pdf-download-verification.json), [문항별 PDF 연결](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/student-pdf-mappings.json).

## 2026학년도 모의 연도 및 Q1 HOLD

공식 게시글 [2025년(2026학년도 대비) 온라인 모의논술 문제 및 해설](https://ipsi.dongguk.edu/admission/html/counsel/dataView.asp?BOARD_IDX=34784),2025-07-04. **2025년 시행/2026학년도**가 맞다. 공식 문제 PDF SHA가 기존파일과 일치하므로 Registry연도·시험ID는 변경하지 않는다.

공식 게시글의 최신 첨부 `자연계 모의논술문제 해설(문항카드)_문항1해설수정.hwp`를 확인했다. 구자료Q1은 `x²/4+y²=1`,최종넓이 `3√3/2`; 공식 수정본은 `x²+4y²=1`,`3√3/8`이다. 이는 공식 자료 대조이며 AI 첨삭 품질 평가가 아니다.

**Q1 `49ea9aaa-1c46-51e7-b148-a03aef20ae4e`는 신규적재·Worker·공개허용목록에서 제외**한다. 기존 문제PDF/Registry메타데이터는 보존하여 기존 문제열람과 첨삭공개를 구분한다. Q2/Q3는 기존 부분공개 계약으로 연결한다. 해설내용을 임의수정하지 않았다. HWP LibreOffice변환은 파싱실패라 폐기했고 구조화본문/수식레코드를 대조했다. Q1해결조건: 공식 수정본을 정상 렌더 검증하여 해당문항의 근거·기준만 교체하고 기존 계약을 재검증한 뒤 공개. [HOLD 근거/원본링크/SHA](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/hold.json).

## 사전 검증 및 적용계획

- 운영 SELECT137검사 PASS,보존지문20그룹 확보. 기존7시험21문항은 전체동국16시험 목록에 이미 존재하므로 browse RPC 변경0.
- 격리 PG17:20문항 제출/멱등성/MockWorker결과/타계정차단/재작성/재첨삭과 비파괴롤백 PASS,연결60검사 PASS. Provider0.
- WEB410 PASS/1 SKIP,APP39 PASS. 타입·정적빌드·Functions빌드 PASS. 기존숙명 테스트5실패는 이전HEAD에서도 동일재현 후2025모의 인문계열을 명시하는 테스트전제만 보완했다. 제품UI·첨삭엔진 변경0.
- 기존DB/권한 확인→273행 원자적적재→80상태·기존2함수 허용목록20추가/검증→논술범위 보존배포→일반계정권한/API 공개확인. WEB3plaintext범위만7시험/20leaf확장; 기존정적자산/API소스/Secrets/Preview/라우팅 보존.
- 장애시 신규WEB범위 닫기→`rollback-admission.sql`로 신규20leaf 진입차단. 데이터·사용자답안·평가·PDF를 삭제하지 않는다. 함수드리프트시 원복가드 중단. 격리롤백 PASS,운영실행0.

## 데이터 보존 검토

기존 Registry·사용자 이력을 유지하고 신규 내용만 분리 적재한다. 과거 결과/재첨삭 lineage를 덮어쓰지 않는다. 기존 사실·평가·공식 근거와 미래 모델 판단을 합치지 않는다. 새 개인정보 수집0,접근권한 확대0,보존기간 변경0. 기존 원본SHA·문항/시험ID·평가버전을 추적한다. 기존 분석/결제/Credit 의미와 삭제정책을 변경하지 않는다. 이전 대학 데이터와HOLD는 별도보존한다.

실제 AI 품질 검수는 전체 대학 작업후Owner가 수행한다. 로그인브라우저·실기기 미실행 항목은 NOT TESTED로 남긴다. 전체10대학 완료를 의미하지 않는다.

## 최종 운영 결과 — 공개20 / HOLD1

**2026-11-12 14:11 KST**, 7시험 중6시험 전체·1시험 부분, 총20문항을 운영 연결하고 사용자에게 공개했다. 대상21 전체완료가 아니라 **20 PUBLISHED + 1 HOLD / 대학상태 PARTIAL**이다. 기존기록과 권한은 보존했다. 다음은 광운대학교이며 이번 작업에서 착수하지 않았다.

|학년도·시험|시험 ID|공개|HOLD|
|---|---|---:|---:|
|2022 모의|`0fa138ec-e8a0-56a6-b241-4c883c86eacc`|3|0|
|2023 모의|`f5f512ab-79d1-50f9-8d79-039393226b00`|3|0|
|2024 모의|`3b9a5530-3362-5223-94f1-04922e6f5d11`|3|0|
|2025 수시|`627bbcc2-707c-5b4f-b3a7-d504c4dd5a4c`|3|0|
|2026 수시|`8871c481-f6e2-5f87-b3c8-45c042f6a775`|3|0|
|2026 모의|`324dbf82-b4bc-5607-977b-2cf512812212`|2|1|
|2027 모의|`81f8d0b3-6751-542e-913e-b4169a247de6`|3|0|

### 적용 및 실제 확인

- Migration `20261112051055_dongguk_20_math_public_release`:273행 연결,80개 상태ACTIVE,기존 두 내부함수 허용목록만20leaf 추가. 사전137/적재후156/활성화60 PASS. SQL SHA는 scope.json에 고정,이력은 정확SQL과 같은트랜잭션에 기록.
- 실제 일반계정 authenticated 역할의 `math_catalog`:신규20/전체340,이전320항목 내용 정확히 동일. 기존 history조회 정상. Q1 Math/Worker자료0행 및공개leaf목록 제외 확인. 이는 실제브라우저JWT로 로그인·제출했다는 뜻은 아니다.
- 기존 `essay_browse_catalog(text)` 함수본문/owner/ACL 불변,동국16시험 반환값 정확히 동일. 그중 자연7시험21문항 메타데이터는 기존부터 보였고 이번20문항의 첨삭연결만 활성화했다. Q1 문제열람/로컬초안 기능은 유지되지만 첨삭공개 대상이 아니다.
- 기존RLS271개·테이블owner/ACL107개·Registry/대학/사용자답안·평가 보존. 두허용목록 외 함수정의 불변,함수owner/ACL 모두보존. INSERT/활성화 내부20그룹 원자적보존가드 PASS,활성화후19그룹 지문 동일.
- 별도SELECT 사이 Credit 거래1건이 정상추가됐다(2026-11-12 14:10:01 KST). 기존669행 전체지문 동일,이번작업 Credit쓰기0. 서로다른시점의 총행수670을669와 같다고 보고하지 않는다. [동시거래 보존기록](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/concurrent-credit-observation.json).
- WEB deployment `8d313832-7b00-4a9f-864c-69fda576dea9`,source `e7575f00affe98a9e8a2ca50a7850e3f94cde258`. 공개308시험/확장138시험/Math340leaf. 기존비논술2179자산·API소스·라우팅·Secrets/Preview설정 정확히보존. 세plaintext 공개목록만확장. 실제도메인 논술/로그인/공개목록200,비로그인PDF인증401 정상.

### 검증 범위와 남은 항목

WEB410 PASS/1SKIP,APP39 PASS,타입·Next·Functions빌드 PASS. 기존5테스트실패는 이전HEAD에서도 재현했고,확장된 숙명목록에서 기존인문2025모의fixture를 명시하도록 테스트만보완해 최종0FAIL. 새제품코드/엔진수정0.

격리환경에서20문항 각각 기존Worker의 제출/중복방지/Mock결과/타계정차단/재작성/재첨삭/롤백 검증 PASS. 실제Provider0,운영검수답안0. 운영에서실제AI결과를 생성한 것으로 보고하지 않는다.

비로그인브라우저 자연계열7회차·2022–2027목록·2027모의/2026모의문항·Q2 사진/수식텍스트입력·PDF3쪽참조를 확인했다. 로그인PDF 렌더/실제제출·결과·재첨삭 UI 및 iPhone/Android **NOT TESTED**. PDF는운영7파일다운로드SHA/35쪽/시작쪽/정상계정Storage접근과로컬렌더로검증했다. AI품질은전체대학후Owner통합검수다.

보안advisor 기존5종/222항목 동일,신규지적0. 기존RPC실행가능WARN·정책없는private RLS INFO 등은이번공개작업에서변경하지 않았다. [보안지문과원문안내](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/security-advisors.json).

Q1 HOLD해제는공식수정본근거의정상렌더·기준/Worker연결 재검증이조건이다. 승인되지않은해설변경은하지않았다. 한국항공5HOLD/7DRAFT·중앙과학11HOLD·숭실2024Q2HOLD·성균관15RIGHTS_HOLD 유지. 기존서강/숭실/숙명DONE재작업0.

### 복구와 Git

[웹공개범위 원복정보](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/web-rollback.json)와 [첨삭진입 차단SQL](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/rollback-admission.sql)을준비했다. 기존입력/결과/PDF삭제없음,원복드리프트가드·격리검증PASS. 운영원복0회. 최초직접DB호스트DNS실패는운영변경전발생했고,기존프로젝트세션풀러로연결해해결했다.

Git WEB배포소스 `e7575f0`,APP사전검증 `ae6ebad`. 최종Wiki/증빙커밋은이문서를포함하는커밋과완료보고HEAD를참조한다. [최종영수증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/final-release.json) · [운영DB검증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/production-receipt.json) · [공개배포검증](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/web-production-receipt.json).

Owner후속확인: 동국20문항공개완료,2026모의Q1 HOLD유지. 광운21시험42문항공개연결진행승인.
