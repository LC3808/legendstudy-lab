2026-11-14: [논술 LAB 관리자 운영 콘솔 개편 설계(WEB)](essay-lab-admin-console-redesign-20261114.md). **실제 코드 기준** — 콘솔 대부분 이미 구현(운영 모니터링 `admin_essay_operations` 평가상세·재처리·Provider영수증·이용권거래 ✅, 학생 코멘트·만족도 `essay_feedback_submit`+`/admin/essay-feedback` ✅, 품질 루브릭 `hq-rubric-v1`+`/ql` ✅). 개편 핵심=메뉴 IA 재그룹핑 6묶음 + 연결자(operations↔/ql·feedback↔/ql·credit↔첨삭) + 운영 경고 스트립. 코멘트/루브릭 **신규 금지(재사용)**. P0(이용권 최근첨삭순·첨삭 처리과정)는 🧩Codex 진행중, Claude는 UX·IA만. 코드·DB·배포 변경 없음.
2026-11-14: [학생 MY 개편 설계(Flutter)](student-my-redesign-20261114.md) · [관리자 학습·입시 종합현황 개편 설계(WEB)](admin-learning-admissions-overview-redesign-20261114.md). **실제 코드 열람 기반**(APP `c4511dd`/WEB `041e6cd`). 확정: APP은 5탭·커스터마이즈 홈·'나의 대학 소식'(RPC `university_news_feed` 연결 완료)·MY 저장/최근 자료 노출 모두 ✅(상위 IA의 "미구현/미노출"은 WEB 한정). 관리자 랭킹은 **서버 페이지네이션+검색 이미 배포**(TOP10 아님), 학교랭킹 `admin_study_by_school` ⛔배포대기, 성적/검증 ⚪. 제안: 학생 MY 상단 현황요약+입시 묶음 / 관리자 3축(입시·학습·이용)+운영자 제외 토글, 둘 다 기존 RPC 재사용·신규 최소. 코드·DB·배포 변경 없음.
2026-11-13: [개인화·홈/MY/관리자 정보구조(IA) 개편 설계안](personalization-my-ux-ia-20261113.md). 조사·구조설계·개선안만(코드·DB·배포 변경 없음). **조사 범위=WEB 저장소 중심, Flutter는 Owner 제공 사실(🔵)로 구분.** 핵심: **WEB** 개인화 홈 부재(**Flutter는 개인화 홈·'나의 대학 소식' 카드 구현됨**—Owner 제공, 현재 "공식 정보 연결 준비 중" 상태)·따라서 '나의 대학 소식'은 **WEB 미구현 / Flutter 데이터연결 미완**으로 구분. 논술 일정 42개 catalog를 관심/실제지원과 연결하는 **최소 구현을 최우선**(신규 RPC 없이 클라이언트 조합). 신규 RPC 6종은 **후보**(기존 조합 선검증). 관리자 종합현황 개편과 학생 MY 개편은 **별도 작업**. A–I 산출물 + Codex 명세 초안 포함. Owner 검토 후 구현 범위 확정.
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
