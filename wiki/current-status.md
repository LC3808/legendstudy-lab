2026-11-13: [성균관15 공개·302공개6잔여](essay-skku-public-20261113.md). 실제 운영HTTP/DB 검증 PASS, Provider0.

[잔여6 처리](essay-remaining6-resolution-20261113.md): **304공개/4잔여/308**. 항공2 공개·항공3/숭실1 공식 충돌. 기존302/기록/권한/Credit 보존, Provider0. WEB63PASS/build·APP15PASS4SKIP; 실제로그인제출/기기/AI품질NT. 성균15·이화87 CLOSED, 전체 PARTIAL. 아래는 과거 이력.


2026-11-13: [경희모의4·과학18 운영 공개 / 287공개21잔여](essay-khu-science-public-20261113.md). 기존 데이터·권한·Credit·비논술 기능 보존, Provider0.

2026-11-11 22:43 KST: [작업05-D 운영 적용](admin-withdrawal-production-20261111.md) — 공부시간 전체기간 및 탈퇴 조회2RPC 적용·운영 검증 PASS. WEB 배포/E2E 진행 중. 아래 05-B/C 미적용 표기는 당시 기록.

2026-11-11: [작업05-C — 관리자 공부시간 전체 기간 후보](admin-study-period-contract-20261111.md) — 기존 RPC1개에 NULL/NULL 전체 기록 지원 후보. 기존30일·구간 union·권한 유지, 다른 RPC 계약 변경 없음. UI6+탈퇴35 PASS, 격리 DB·원복·TS·Lint·build PASS. 실제 전체28명/205,102,629ms,30일27명/205,098,836ms 원천·독립 계산 일치. 기존 관리자6실패·checkout문구 실패 유지. SQL·탈퇴RPC·WEB 모두 미적용; Owner 새 승인 후 공부시간→탈퇴2RPC→운영검증→WEB 순서.

2026-11-11 21:14 KST: [작업05-B — 탈퇴 조회 RPC 사전 검사](admin-withdrawal-rpc-preflight-20261111.md) — 신규2RPC 조건부 승인 확인. 기존7실패 재현·신규35 PASS·격리DB PASS. 기존 대시보드 전체기간(NULL)→운영 공부시간 RPC PT422 계약 결함 확인으로 지시3-C에 따라 **적용 중단**. SQL/Migration/WEB 적용0, 신규RPC 미설치. 기존함수286·테이블권한127·RLS정책120·관리자명단·계정상태550·탈퇴요청3 전후동일. 최근30일/기존회원조회 정상. C해소 후 운영검증 재개; WEB승인 요청은 그 이후.

2026-11-11: [작업05 — Claude 관리자 인수·탈퇴 관리 후보](admin-withdrawal-management-20261111.md) — 별도 Codex 브랜치에서 목록/KPI/최소 활동상세·후보 read RPC2개 구현. 운영 대기3건 SELECT 대조, 신규35테스트·격리DB·TS·변경Lint·build PASS. 기존 관리자7실패/boundary실패 유지, 신규회귀0. 운영 SQL·WEB·Claude 병합 미실행. 최신 canonical 실조회9788a7ca(source0eefc7d); 과거 아래 배포들은 역사적 기록. 다음: 공통검증 정리·Owner승인·운영E2E.

2026-11-10: [Codex 인수인계 — 학습·입시 기능 최종 보고](codex-handoff-learning-admissions-20261111.md). WEB canonical `9788a7ca`(git `0eefc7d`) 기준. 희망(직접insert)/실제지원(RPC·이벤트소싱)/합격이력보존/학교순위/초대퍼널/개별지원로스터 운영 적용 완료, 실사용 E2E·운영자 세션은 미검증. 내일 Codex 작업 A–F 연결점 포함. 운영 변경 없음.
2026-11-08: [자료 동기화 관리자 후보](material-sync-admin-20261108.md). UI·TEST·빌드 완료, 추가 운영 승인 대기.

# WEB current integration status

2026-11-08 긴급: [대학42 상태 복구·1618 APP67 검수·일일 갱신 후속](emergency-status-material-sync-20261108.md). Functions918661c/Pages e2ea3191 운영 PASS. 자료 수정 Owner PASS. 일일 자동 경로는 별도 후보·승인 대기. 아래 이전 배포는 당시 기록이다.

As of 2026-11-04, the reviewed Math/commerce/social connection is deployed to [production WEB](https://lab.legendstudy.com), with exact server scopes. Code/deployment verification is complete; authenticated production user/Provider E2E and quality acceptance are reported separately by the coordinating release task.

- Current photo-input/History follow-up deployment `98c8e200-b8e2-41c0-83b3-8c96f42d36fe`, source `0cc53505ed3aac856a19089af9c6bafe2d31ba08`. Its API bundle was recompiled for the reviewed confirmed-photo input adapter; the prior display fix remains included. The underlying activation deployment was `2a794c31-217b-42d6-81a6-d2ae79d873e7` / `45bd519`. The preceding compatible HOLD deployment allowed the release lead to apply and verify four guarded DB increments before activation.
- Actual deployed plaintext scopes: public212 (existing211 + verified Sogang1), expansion42, Math72 (71 nonmedical + legacy1); Math execution and continuous cycles true. The matching complete beta target is202 (existing160 + new42). Medical nine and incomplete new exams remain excluded. Existing Registry, Evidence and engines reused.
- Worker public212 changed via documented inheritance of the other13 bindings; active version `d03763e8-dcf7-4644-ac59-b7440cee87d7`. All untouched plaintext hashes, Secret names/types, service/queue bindings and Pages Preview/other settings matched. No Secret values copied or replayed.
- Expanded mixed exams require every approved answer before WEB daily claim/quote. DB remains authoritative for accepted/idempotent replay; stored partial History retains accurate coverage labels and plain humanities selected-question submission is unchanged.
- Full WEB regression1,734 PASS / four existing SKIP; photo-input124, History/rewrite31, mixed-contract74 and rendering/input24 focused checks PASS. TypeScript, changed-file lint, Next production build, Functions compile, boundary and targeted secret-material scan PASS. Existing production admin/review routes and private headers are preserved.
- Production anonymous smoke: home200, availability checked=false, public-status/admin/Owner-review401. This WEB deployment invoked no Provider and made no direct DB/financial mutation. Authenticated availability and real submissions are separate evidence, not implied by these checks.

See [implementation and deployment evidence](math-commerce-release-integration-20261103.md). Canonical policy and final activation/E2E report remain in the APP Wiki. APP58 and APP41 build artifacts are preserved; Store actions belong to the Owner. Post-core rollback retains compatible code under explicit Math/new-scope HOLD and never deletes accepted jobs, financial history or drafts.

Actual Inha OCR retained correctly formed indexed radicals `√[4]{3}`/`√[4]{u}` but the display projection fell back to raw source. The reviewed lossless rendering fix is now deployed, with compact question labels kept as text. All Pages settings and deployed environment hashes remain unchanged; four actual new renderer assets matched local artifact hashes. No Provider/confirmed-text/engine change or active Owner-browser reload occurred.

Deployed live-E2E follow-up: exact exam/university IDs now resolve registered Math History metadata and reopen the same-exam free-rewrite editor. Actual production UI verification confirmed Inha2027 identity/year, editor entry and prior confirmed-photo text loading. The existing photo editor becomes available after its canonical Math catalog resolves; no new input mode was introduced. The reviewed Provider adapter explicitly includes student-confirmed photo regions, and output validation rejects an ungrounded empty NOT_ATTEMPTED result for nonempty submitted work. This does not assume correctness or override grading. The original held result remains preserved. Fresh-photo evaluation, free-cycle completion and mathematical quality remain separately verified by the release lead; tests or deployment are not a substitute for those outcomes.

2026-11-04 dashboard/member focus: see [readout implementation and verification](admin-member-dashboard-20261104.md). Owner authorized removal of minimum-five admin statistics, N수 separation, period filters, compact member details, and production read SQL + WEB deployment. No financial actions or APP58 build.

Member material follow-up: [recent5 bookmark/view activity and common admin navigation](admin-member-activity-navigation-20261104.md). Bookmarks=favorites confirmed by Owner. Admin routes publish together to eliminate mixed menu versions; existing credit v2/support contracts preserved.

App usage follow-up: [WEB rankings and APP collection handoff](admin-app-usage-rankings-20261104.md). Existing material member counts only; menu telemetry not collected. APP implementation/release separate per Owner.

- [고려대 자연계 운영 공개 및 TEST 20문항 검증](task20-korea-20261106.md)


- 2026-11-07 한양대 자연 **21시험·42문항 PRODUCTION_CONNECTED**. 추가 17시험·34문항 승인 적용 및 일반 사용자 WEB 전수 PDF·답안 작성·첨삭 진입 PASS. Provider·차감 0회. [운영 적용 보고](task20-hanyang-production-connection-20261107.md) · [Claude 배너 공개 목록](task20-hanyang-claude-banner-20261107.md).

- 2026-11-07 [중앙대 자연 수학 20시험·69문항 연결 후보](task20-chungang-connection-20261107.md): TEST 근거·Catalog·PDF 계약 검증 완료, 운영 승인 대기. 과학Q4 11문항 Owner 보류.

- 2026-11-12 [건국대 자연 공개 완료](konkuk-public-20261112.md): 신규6시험24문항 PUBLISHED, 기존4보존. Pages802acf70/source96bb290, 공개API·일반계정·PDF6개 PASS. 실제AI 품질 검수는 Owner 통합 단계.

- 2026-11-12 [경희3시험7문항 공개 완료](kyunghee-public-20261112.md): Pages532977a6/source2f585c0, 기존3/건국28/2166자산 보존. 과학12 평가진입 제외, 실제AI0.

- 2026-11-12: 다음 성균관15문항은 기존PDF RIGHTS_HOLD 유지. 원본 이용조건/표시승인 미확인·운영PDF4/5·일반조회0. 신규변경 없음. 상세는 APP wiki/essay-sungkyunkwan-rights-hold-20261112.md.

[대학 소식 연결](university-news-phase1-connected-20261113.md): API운영/Flutter구현, 29연결13미완료. 테스트17PASS·실기기NT.
