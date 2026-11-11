2026-11-11 22:43 KST: [작업05-D 운영 적용](admin-withdrawal-production-20261111.md) — 공부시간 전체기간 및 탈퇴 조회2RPC 적용·운영 검증 PASS. WEB 배포/E2E 진행 중. 아래 05-B/C 미적용 표기는 당시 기록.

## 2026-11-11 — 작업05-C

관리자 전체 기간 계약 조사·공부시간 함수1개 후보 구현. 현재 기간 집계 보존 및 수년 기록/학교합계/권한/원복 격리 검증. 운영 원천 SELECT 대조만 수행. 신규 탈퇴35검사 보존, UI6검사 통과. 운영 미적용. [상세·적용/원복 계획](admin-study-period-contract-20261111.md).

## 2026-11-11 — 작업05-B 운영 RPC 사전 검사

신규2조회 RPC 조건부 승인 후 기존7실패/checkout 경계 실패 재현. 추가 운영 읽기 검사에서 대시보드 전체기간 NULL 요청이 기존 RPC의 PT422로 거절되는 API 계약 결함 발견. Owner 지시3-C에 따라 적용 중단. 기존 메타데이터·계정 상태·탈퇴 요청 보존 대조, 신규35검사·격리DB/원복 PASS. 운영 SQL·Migration·WEB 실행0. [근거·분류·재개 계획](admin-withdrawal-rpc-preflight-20261111.md).

## 2026-11-08 — 자료 동기화 관리자 후보

기존 AdminSurface에72시간/수동 요청·상태/변경 집계 구현. UI21검사·빌드 PASS. 기존 콘솔4fixture실패 baseline 동일. 추가 SQL/WEB 승인 대기. [상세](material-sync-admin-20261108.md).

## 2026-11-08 — 긴급 복구

[대학 공통503 원인·운영 배포·대표6경로·생활과 윤리 수정](emergency-status-material-sync-20261108.md).84검사 PASS/42카드 정상. Owner APP67 두PDF 표시·열람 PASS. 자동 갱신은 구현 후보/운영 승인 대기.


## 2026-10-31 TASK05

기존 feedback 원장 기반 사용자 의견·오류 신고와 관리자 Inbox/통계, 신고별 기존 Owner 검수 연결. [범위·검증·승인 대기](essay-feedback-task05.md). 운영 미적용.

## 2026-11-01 TASK08 isolated review

Code068c07c adds exact opt-in loopback QA origin/project guard and synthetic banner; production config unchanged. Typecheck/build PASS, lint0errors/5existing warnings, tests1461PASS/4SKIP. Local http://127.0.0.1:4308 uses Docker Supabase54321; no production deploy. Owner login/admin read/notice draft smoke verified; ordinary account RPC403. No evaluation test gateway, remote Preview, shared mobile backend or real GA4 reception: PARTIAL/HOLD. Canonical report is APP Unified Wiki `wiki/essay-beta-integration-task08-20261101.md` (LC3808/legendstudy-app).

## 2026-11-01 — TASK09 private shared TEST Preview (PARTIAL/HOLD)

Reused existing `kpqbedylxlyntrrfybpn` sandbox. Added TEST-host-only access-code middleware, all-path export routing script, and TEST banner. Production routing manifest and deployment unchanged. Current TEST deployment `095d922a-7301-48ac-b23f-2063b7d30518`, https://legendstudy-task09.pages.dev. Initial ungated TEST deployment was removed after detection and replacement.

Owner Chrome TEST login, notice and feedback listing verified; student admin denial via API. Full Vitest1471 PASS/4 SKIP, TypeScript/build143 routes/focused lint PASS; access middleware10 tests. No real Provider/payment/evaluation. Beta predecessor schema and isolated evaluation Gateway block full acceptance; APP33 remains read-only. Secrets excluded.

Canonical Unified Wiki in APP repository: `wiki/essay-shared-test-task09-20261101.md`; DB sequence under `supabase/candidates/task09_shared_test/README.md`. No second canonical status maintained here.

## 2026-11-01 — TASK10 GA4 pre-build readiness

Reused the existing 31-event/14-parameter adapter and admin Analytics v1 screen. Added fail-closed, host-scoped GA4 bootstrap/manual route pageviews, privacy-safe URL/referrer context, and collection readiness separate from report read access. Collection is disabled without all reviewed configuration values. No production deployment, migration, native release build, payment or Provider call. Canonical configuration, validation and Owner checklist: APP Unified Wiki `wiki/admin-integrated-analytics-task10.md` in LC3808/legendstudy-app. Actual GA4 receipt and reporting authentication remain unverified.

- 2026-11-01 TASK11: grouped admin navigation, existing reports/Student360 reuse, bounded learning aggregate viewer, private branch Preview. Partial completion and data-source gaps: [WEB handoff](admin-data-task11-web.md); canonical detail in APP Unified Wiki.

## 2026-11-02 TASK17

Isolated WEB branch/worktree from843f3a8; APP39 preserved. Existing TEST entry REVIEW authorization mismatch fixed,123 payment tests/TS/build/lint pass. Production runtime configuration remains NOT_READY; no ledger or provider mutation. See [evidence](toss-test-task17.md).

TASK17 production checkpoint: source3e60222 → Pages2b5b0656; TEST entry UI verified, unchanged API configuration still NOT_READY. DEPLOYED/PARTIAL, no payment E2E claim. APP39 source untouched.

## 2026-11-02 — TASK17 continuation preflight

[TEST recovery](toss-test-task17.md): production deployment/config metadata and runtime503 reconfirmed; DB TEST/LIVE0/TEST grant links0 baseline captured; review URLs200 and123 regressions PASS. Owner direct TEST key rotation pending; approval E2E/re-submission NOT_READY. No deployment/config/DB writes.

## 2026-11-02 — TASK17 existing TEST environment recheck

[Environment comparison](toss-test-task17.md#environment-recheck--2026-11-02-0940-kst): prior new-key handoff superseded. Existing payment-test runtime200/TEST, isolated order created and Toss card authentication reached. LAB503 separate. Owner card authentication pending; secrets/deployments/config/ledger writes0; one TEST order created by existing API.

## 2026-11-02 — TASK17 dedicated payment review account

[Checkpoint](toss-test-task17.md#dedicated-account-deployment-checkpoint--2026-11-02-0957-kst): existing confirmed non-admin payment account UUID-only permission applied. Production ed3c8c8b preserves1178 assets; bounded diagnostics prove missing finance token, TEST key format passes.140 tests/typecheck PASS, real E2E blocked. Owner login verified. Original ledger hashes unchanged; concurrent signup+6 separately recorded.

## 2026-11-02 — TASK17 registered Finance binding diagnosis

[Diagnosis](toss-test-task17.md#finance-binding-diagnosis--2026-11-02-1010-kst): registration confirmed; runtime property exists/string/empty=true. Not a missing name or Supabase401. Unchanged config redeploy88a28465 reproduces;141tests/typecheck PASS. No Secrets/ledger changes; restoration remains blocked, TEST runtime200 preserved.

## 2026-11-02 — TASK17 Finance configuration-source diagnosis

[Final recovery diagnosis](toss-test-task17.md#finance-final-recovery-diagnosis--2026-11-02-1025-kst): build-only probe confirms empty finance before app code; intentionally failed before deploy, command restored, production88a28465 preserved. Oct23 redacted-secret replay history identifies likely origin. Existing-token-first Owner runbook prepared; no replacement/financial writes. Original ledger hashes preserved; runtime503/TEST200, approval E2E blocked.

## 2026-11-02 — TASK17 original finance material found

[Origin evidence and concrete renewal](toss-test-task17.md#original-token-found--2026-11-02): existing local JWT expired Oct14; signature/private key match current Production JWKS, gateway allowed. Historical Oct07 signer synthetic regression PASS. Same-key renewal requires no DB/signing configuration change. No mint/config/ledger mutation.

## 2026-11-02 — TASK17 final review preparation

[Final checkpoint](toss-test-task17.md#final-review-preparation--2026-11-02-afternoon): review account restored/24h finance renewed, usage-pass copy on bounded WEB routes. Production9459776f/source ecd8ffc,984 other assets preserved. Actual TEST window/cancel PASS; approval pending Owner authentication. Guide prepared, ledger hashes unchanged/LIVE0.


## 2026-11-02 13:30 KST — TEST approval confirmed

Owner completed authentication and observed success CTAs/essay LAB navigation. Provided Toss TEST API screenshot: confirm HTTP200, DONE, approved13:30:30 KST; order matches f1f36979-33fa-4ee2-971d-7646d6e367f8. Independent Production DB: PAID/TEST_RECORDED/grant NULL/CONFIRM SUCCEEDED exactly1. LIVE orders0/TEST grant links0; original50 grants/139transactions hashes unchanged. Current totals51/140: one concurrent signup_bonus_v1 +3, no payment grant. Successful TEST approval E2E PASS; actual provider decline and postapproval refund remain untested. [Updated submission guide](../docs/TOSS_FINAL_REVIEW_GUIDE_TASK17.md). No new deployment or external submission.


## 2026-11-02 — Owner product wording correction

Removed the mistakenly added AI prefix from product names, pricing/refund copy, provider order display name and submission guide. Production e8c2a05f-6e13-42c3-9346-4eb42c4d9214/source b0176ff verified success; public pricing/refund/checkout no AI essay wording.138 tests/build PASS. Credentials, permissions, ledger and historical confirmed order unchanged.


## 2026-11-02 — Payment verification progress card

Owner screenshot showed unstyled confirmation pending screen. Reused completion card for pending/recovery, initial busy state prevents retry-button flash; pending hides actions, resolved/error state offers styled recovery actions. API/confirmation semantics unchanged.17 callback tests/build PASS. Production e081a02c-456f-4eec-8a59-77483ad547e2/source8180124 verified initial loading text and actual recovery card in browser. No new payment/credential/ledger changes.


## 2026-11-02 — Terms/privacy usage-pass terminology

Owner specified /terms/ and /privacy/: replaced all Korean credit wording in policy text/terms metadata and scoped header label.20 existing legal tests/build PASS. Only terms/privacy static routes plus new content-hashed assets overlaid; APIs/config/other routes preserved. Production661d8736-36c7-4a80-ae46-d81f2449a757/source9c8df7e verified success, both actual URL rendered-text scans contain zero 크레딧. Legal conditions/prices/periods unchanged; no DB/APP mutation.

## 2026-11-02 — TASK17 whole WEB terminology audit

[Audit](../docs/TASK17_WEB_TERMINOLOGY_AUDIT.md):56 page entries/155 public HTTP routes/whole source string AST. User/shared23files83fragments,admin18/62,internal1/1 remain. Public residuals support/essay-lab/account-credits/admin-credit/internal-connection. Authenticated conditional views source-inspected only; no UI/API/DB change or deployment.
## 2026-11-02 — TASK16-B commerce TEST integration (in progress)

Existing Essay/Math Worker, immutable exam History and LAB result UI reused. Math results now separate final-answer verdict and reasoning steps; result headers distinguish complete/partial/unknown exam coverage; missing/duplicate/foreign submitted results fail closed. Approved question PDF viewer is available from results. Exact `legendstudy-task16b.pages.dev` + `kpqbedylxlyntrrfybpn` + Hanyang2026 commerce scope can bypass the production mixed hold only in TEST. All-route private access gate reused, with credentialed Math callback only. Production launch holds and financial RPC implementations unchanged.

Owner authorized isolated TEST backend. Existing IAP sandbox reused; no production mutation. Representative exam `e8ea5bb3-0956-5fd6-b90e-4b7fb350b2f9`, Q1 Essay/Q2 Math. Actual Provider E2E, rewrite and browser acceptance are still pending; do not label this completed. Canonical handoff: APP repository `wiki/task16b-commerce-social-integration-20261102.md`.

## 2026-11-03 — TASK16-H isolated WEB Preview

Academic Purple math review workspace (source/result/concepts), responsive 3/2/1 columns, owner-authenticated originals/transcripts, cumulative hints, explicit server solution disclosure and existing rewrite UI. Code `6f5d726`, TEST Pages `legendstudy-task16b` deployment `4aaecbbc`. 1578 tests pass/4 existing skip; final affected18, types/lint/build pass. Live browser and Native Simulator cross reads pass. Two unevaluated WEB typed inputs saved; next-cycle quote1 cancelled before submission. Provider0/newcharge0; production unchanged. OCR/quality/mixed/newWEB evaluation E2E remain incomplete. Canonical report: APP worktree `wiki/task16h-web-math-ux-20261103.md`.

## 2026-11-03 — TASK16-I real isolated integration validation

Code e3efa29 / dedicated TEST deployment e22dd7a8. Reused region confirmation, preserved raw transcription conclusions, blocked observed unreadable markers. Natural WEB photos→paid Q1/Q2→free Q1/Q2 completed; commerce Essay+Math completed as one exam. Existing TEST grant2 consumed2, free0, final balance/reserved0; duplicate Math requests preserve ledger. Native cross-read/hash verification pass; WEB1586pass/4existing skip. OCR/learning feedback/full-solution quality remains PARTIAL, production HOLD. Canonical APP report: `wiki/task16i-integration-quality-20261103.md`.

## 2026-11-03 — Candidate B Native LAB discovery repair

Owner B51 normal LAB navigation exposed a TEST boundary gap: authenticated Native GETs to `public-service-status` and `service-status` returned the browser access-code HTML (401), while `availability` returned valid JSON (200). Add only these two exact GET paths on the canonical TASK16B hostname to the existing bearer-to-handler handoff. The handlers still validate the session and server-approved exam scope; no browser gate removal, key/configuration change, production deployment, Provider call or financial write. Gate/discovery/service regression 31 PASS, TypeScript and isolated static build PASS. TEST deployment/read verification and Native retry-state regression are recorded in the canonical APP Wiki `wiki/app-candidate-b-device-web-qa-20261103.md`.


## 2026-11-03 — Production-based Math/commerce integration candidate

Reused 23 Math commits on actual production `c9bda913`; preserved TEST branch and unrelated production analytics/payment/admin/humanities changes. Added exact production manifest admission for 16 existing exams (46 canonical Math leaves plus one preserved legacy leaf), full-set checks, natural Math-session routing and shared daily-beta credit-source consent. Existing engine, Registry and financial/history contracts reused. Full tests 1705 PASS/4 existing SKIP, lint/Next build/Functions compile/boundaries PASS. No production mutation or deployment. [WEB implementation evidence](math-commerce-release-integration-20261103.md); canonical APP report `wiki/app-math-commerce-integration-report-20261103.md`.

## 2026-11-04 — Versioned SQL review package and TEST source contract

Added production core/scope/beta candidates with PG17 and rollback proofs; production unapplied. Separate exact TEST upgrade applied, postflight six functions and unchanged ten data counts PASS. HTTP free quote/anonymous denial PASS, paid source NOT_VERIFIED due balance0; overall PARTIAL, no Provider/new evaluation/grant allocation. [Package](../supabase/candidates/release57_math_commerce_20261103/README.md).

## 2026-11-04 — Broader Math/commerce/social connection candidate

Reused current production Registry/Evidence reads to expand the explicit WEB manifest from 16 to 42 complete exams (six universities, 110 questions, 71 Math leaves). Preserved existing humanities evidence and prior partial visibility; excluded medical/incomplete new exams. Removed an unnecessary Math Provider dependency for Essay-only social/commerce discovery. Full WEB regression 1,707 PASS / four existing SKIP; TypeScript/focused lint PASS. Current production deployment and secret presence verified read-only; no deployment, Provider call or DB mutation in this source step. [Implementation/deployment contract](math-commerce-release-integration-20261103.md).

Packaging follow-up: persisted the two existing production GA4/Owner-review routes and private admin/review headers that the prior custom deployment script had injected. This prevents full-build deployment from silently bypassing those APIs. Two additional route/header regression tests PASS.

## 2026-11-04 — Production compatibility HOLD and mixed completeness

Owner-approved staged WEB deployment `d8b0d2de-72aa-4ba0-ac76-a9a8fc2ddb84` from `172c5e1` changed only the Math execution flag to false before the coordinated DB increments. All other plaintext bindings, Secret names/types, service bindings and Preview settings were compared unchanged. Home and existing protected APIs passed anonymous smoke; no Provider called. The release lead then reported verified core/scope/beta application.

A final preflight found partial mixed submission still possible. Added the exact expanded mixed-exam requirement to existing admission/quote/UI contracts, before daily claim and submission; new DB guard errors map to actionable messages. Accepted replay remains DB-authoritative, History stays readable and existing humanities subset policy is retained. Relevant regressions74 PASS. Final activation remains gated on the matched SQL guard, build and deployment. [Details](math-commerce-release-integration-20261103.md).

## 2026-11-04 — Expanded production WEB connection deployed

After the release lead verified core/scope/beta/mixed guard transactions, final source `45bd519` was built and deployed as Pages `2a794c31-217b-42d6-81a6-d2ae79d873e7`. Actual deployed public212/expansion42/Math72/Mathtrue/cyclestrue verified. Worker public212 uses13 inherited bindings; active version `d03763e8-dcf7-4644-ac59-b7440cee87d7`, with other settings preserved. Full1,718 WEB tests PASS/four existing SKIP; build/TypeScript/Functions/boundary/security scan PASS; home200 and protected routes401. No Provider or direct DB/financial mutation by WEB deployment. Real authenticated/Provider E2E remains a separate coordinating-task check. [Evidence](math-commerce-release-integration-20261103.md).

## 2026-11-04 — Inha indexed-root display follow-up prepared

Actual production OCR exposed a display-only fallback for explicit `√[4]{...}`. Added lossless radical-to-TeX projection and compact question-label text separation, preserving source and malformed fallback. Rendering/input/evidence regression24 PASS; no Provider/DB change or deployment. [Details](math-commerce-release-integration-20261103.md).

## 2026-11-04 — Indexed-root display fix deployed without configuration changes

Deployed source `691ba72` as `f11d97ab-248d-49fd-aa5e-ddaf0f36c004`. Production OCR source retained the given fourth root; the rendering fallback was corrected without editing transcription. Full1,721 PASS/four existing SKIP; focused24 PASS; build/TypeScript/lint/boundary PASS. Existing API bundle/routes/headers/redirects are byte-identical, all Pages and deployed-env hashes unchanged, four new renderer assets verified over actual production HTTP. No Provider/DB call or active Owner-browser reload. [Evidence](math-commerce-release-integration-20261103.md).

## 2026-11-04 — Math History and same-exam rewrite metadata repair

Live Inha2027 History exposed static-registry-only identity lookup and absent Math year projection. Reuse exact known exam/university IDs plus existing `essay_browse_catalog` metadata for missing bundled exams; on metadata failure keep History without invented labels. Shared identity lookup opens the same registered Math exam for rewriting. Empty typed photo input now loads confirmed raw transcription in reading order, preserving predecessor assets and owner checks. Six regression files31 PASS; no new RPC/DB/Provider call. Deployment is coordinated with the separate photo-input adapter correction. [Details](math-commerce-release-integration-20261103.md).


## 2026-11-04 — Live photo-input and History integration follow-up

Reviewed History/rewrite exact-ID resolution (`4fc3952`) and confirmed-photo Provider input (`0cc5350`) deployed together to Pages `98c8e200-b8e2-41c0-83b3-8c96f42d36fe`. Full1,734 PASS/four existing SKIP, TS/lint/build/Functions/boundaries PASS; unchanged Pages settings and46 environment bindings verified. Actual production Inha2027 History, same-exam free-rewrite entry and confirmed text loading now PASS. Fresh-photo free-rewrite assessment and quality remain separately recorded by the release lead. Prior held result/data preserved; deployment itself invoked no Provider or DB mutation. [Detailed receipt](math-commerce-release-integration-20261103.md#combined-photo-input-and-history-deployment).


## 2026-11-11 — Task05 withdrawal management candidate

[작업05 — Claude 관리자 인수·탈퇴 관리 후보](admin-withdrawal-management-20261111.md) 작성. Claude 원본 보존, 원격d4ceb2a에서 전용 branch. 실제 운영 source0eefc7d 확인. 목록 제외가 아니라 가입일순 발견성+기존상세 subject gate가 원인. 신규 read RPC2개·기존회원내 탭·최소집계 구현. 신규35 PASS/격리DB·TS·Lint·build PASS, 기존7회귀실패 그대로. 운영 SQL/배포/APP/삭제/원장 변경 없음.

- 2026-11-12 [건국대 자연 공개 연결 준비](konkuk-public-20261112.md):6시험24문항, 운영 소스 보존·관련381 PASS. 적용 전.

- 2026-11-12 02:37 KST: [건국 신규24문항 공개](konkuk-public-20261112.md), Pages802acf70/source96bb290. 기존4·비논술2049정적자산·설정/라우팅 보존. 실제Provider0, 신규 공개/계약검증과 Owner 품질검수 분리.
