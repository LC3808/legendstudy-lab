# Production WEB 통합 보고서 (2026-10-24)

> 이 문서는 PR #5 최초 상태의 역사 기록입니다. Codex 후속 통합·실제 빌드·운영 상태 투영 및 Preview 검증은 [WEB release](WEB_RELEASE_2026-10-24.md)를 따릅니다. 대학 카드 12개는 공개 문항 12개를 검증하는 근거가 아닙니다.

Claude UI 개선(관리자 콘솔 PR #2 · MY 마이페이지 PR #3)을 **실제 Production 코드 위에 선별 통합**하고,
사용자 노출 용어 정책(§3)과 정직한 대학별 서비스 상태(§4)를 반영한 통합 결과입니다.
**배포·main 머지는 하지 않았습니다.** 검증 PASS 상태에서 Owner 승인을 위한 배포 준비 보고입니다.

## 1. 기준 (Owner 지시 1 — 착수 시 실제 Production SHA 재확인)
- **Production 기준 브랜치/SHA**: `codex/material-browse-release-20261022` @ **`f1a9e27`**
  (= main `8991b51` + Codex 릴리스 커밋 체인. main은 production의 직계 조상.)
- 착수 시 `git fetch origin` 후 production tip을 재확인 — **f1a9e27 그대로, 변경 없음**. main을 Production으로 가정하지 않음.
- 현행 Cloudflare 배포: **e67a0d37**, 직전 정상: **40c5085a** (롤백 경로로 보존).
- **통합 브랜치**: `claude/web-production-integration-20261024-fa40d8` (이 워크트리, f1a9e27에서 분기).

## 2. 반영한 PR·commit
| 대상 | 소스 브랜치 | 반영 방식 |
|---|---|---|
| 관리자 콘솔 PR #2 | `claude/admin-console-redesign-1a594d` @ `d3140df` | 선별 적용 (merge 아님) |
| MY 마이페이지 PR #3 | `claude/web-my-redesign-20261023-00d88e` @ `1bae540` | 선별 적용 (merge 아님) |
| 논술 WEB UI | `claude/web-essay-ui-redesign-...` (PR #4) | **미통합** — 세션 실패·미준비, Owner 추가 지시 대기 |

공통 조상이 정확히 main이므로, **Codex가 main→production에서 건드리지 않은 파일은 PR 버전을 그대로 반영**(정확 적용),
**Codex가 건드린 파일만 3-way 수동 병합**했습니다. 전체 PR을 merge하지 않고 필요한 변경만 선별했습니다.

## 3. 충돌 해결 내역 (Codex가 건드린 파일 = 단 3개)
1. **`src/app/admin-ql.css`** (PR #2): 양쪽 모두 파일 말단 append (false adjacency).
   → Codex `.ql-source-controls*` 6줄 + PR #2 admin redesign 블록 **양쪽 모두 보존** (셀렉터 겹침 없음: `.ql-*` vs `.admin-*`).
2. **`src/app/globals.css`** (PR #3): 양쪽 말단 append.
   → Production의 완전·검증된 파일에 PR #3의 MY redesign 블록(55줄, brace 균형 확인)만 결정적 append.
   Codex의 refund/pricing/lab-preview 블록 **보존**. 최종 brace 1031/1031 균형.
3. **`src/components/my/lab-cards.tsx`** (PR #3): **의미 충돌**.
   Codex는 라벨 `모의/수능 LAB`→`수능 LAB`으로 변경, PR #3은 시각 클래스 추가.
   → **Production(Codex) 라벨 `수능 LAB` 보존** + PR #3 시각 클래스(`my-nav-card--active/--disabled`, `aria-disabled`, `my-nav-card__tag`) 채택.
   (충돌 시 Production 기능·계약 우선 보존 원칙 적용.)

그 외 PR #2·#3의 모든 파일은 Codex 미변경 → 정확 반영. 평가·Credit·Ledger·History·Worker·Registry·DB·RPC·server-only 모듈 동작 변경 **없음**.

## 4. §3 사용자 노출 용어 정책 (표시 문구만 교체, 계약·enum·데이터 불변)
운영자 화면(`/ql` 품질 콘솔, `components/quality|materials`, `admin/*`)은 사용자 화면이 아니므로 §3 대상 제외.
변경된 **사용자 노출 display 문자열 6개소**:
- `essay-research-preview.tsx`: "AI 첨삭 가능 여부" → "논술 첨삭 가능 여부"
- `university-availability.tsx`: "AI 첨삭 준비 중" → "논술 첨삭 준비 중"
- `trust-label.tsx`: 출처 라벨 "AI 평가" → "첨삭 결과" (enum 키 `MODEL_DERIVED` 불변)
- `my/evaluation-report.tsx`: "AI 재첨삭 평가 설명" → "재첨삭 평가 설명"
- `my/evaluation-report.tsx`: "AI 생성 예시이며 대학 공식 예시답안이 아닙니다…" → "첨삭 결과를 반영한 재작성 예시입니다…", "저장된 AI 생성 예시답안이 없습니다" → "저장된 예시 답안이 없습니다"
- `my/evaluation-report.tsx`: **"대학 공식 예시답안" details 섹션 통째 제거** (내부 평가 근거 비노출)
- `lib/math-learning/core.ts`: 라벨 "AI 참고 풀이" → "참고 풀이" (enum 키 `AI_GENERATED_REFERENCE` 불변, 2곳)

**불변 보존**: `math-eval/*`·`math-learning/runtime/contract.ts`·`physical-contract.ts`의 provenance/enum/서버 프롬프트,
`business-info.ts`의 `privacyActivationGates`("Production AI 평가 provider" — 내부 전용, 공개 페이지 비렌더), 코드 주석.
동반 수정한 테스트 5건(표시 문자열 assertion): `university-discovery.test.tsx`, `human-evaluation-report.test.tsx`, `learning-guidance.test.tsx`, `learning.test.ts`×2, `runtime-learning.test.ts`.
사용자 화면 "AI" 잔존: **0** (전수 grep 확인).

## 5. §4 대학별 서비스 상태 (Owner 지시 2 — DB 하드코딩 금지)
Production에 **이미 네이티브로 구현**되어 있어 신규 로직 추가 없음 (정직성·단일 출처 유지):
- **대학 단위**: `lib/essay-runtime/catalog-policy.ts`의 `servicePreparingUniversityIds`(Owner launch-hold 16개) → `isUniversityServicePreparing()`.
  첨삭 가능 대학은 `첨삭 시작하기`(상단), 준비 중 대학은 `서비스 준비중`(disabled, 하단). 정렬은 `catalog-sorting.ts`가 evaluation-ready를 우선순위 0으로.
- **문항 단위**: `exam.evaluationReady` + `verification==='VERIFIED'`(`source-registry.ts`) → `EssayExamSubmit`(첨삭 가능) vs `첨삭 서비스 준비 중`(disabled).
  문항 유무는 `UniversityAvailability`의 공개 RLS 읽기(`essay_questions.is_published`)로 판정. 문제 PDF는 준비 중 대학도 열람 유지.
- **일반 공개 문항 수 = 12** (Essay 11 + 건국 Math 1). 프런트 테스트가 이를 검증: `university-discovery.test.tsx`는 기본 페이지 뷰에서 `첨삭 시작하기` 링크 **12개**, 전체보기 시 26 가능 + 16 준비중(총 42 대학).
- **GAP (Owner 확인 필요)**: 정확한 "12 공개 문항"은 Pages `ESSAY_PUBLIC_EXAMS` env ∩ DB `runtime_policy/approval`로 **서버/DB에서 최종 판정**됨. 프런트는 `evaluationReady`/`verification`/`is_published`/`servicePreparingUniversityIds`에서 도출 가능한 범위까지만 표시하며, **활성 상태를 프런트에 하드코딩하지 않음**. 운영 DB 직접 조회는 Owner 전용이므로, DB 기준 공개 문항 수 재확인은 Owner 확인 항목으로 남김.

## 6. 검증 결과 (§5) — `./node_modules/.bin/*`
| 검사 | 결과 | 비고 |
|---|---|---|
| `tsc --noEmit` | 4 error | **전부 선존재/env** — `materials/`(pdfjs-dist 미설치), 제 미변경 파일. 통합 유발 0. |
| `eslint .` | 2 error·1 warn | **전부 선존재** — `my/essay-history*`·`lib/my/exam-history*`, 제 미변경 파일. 통합 유발 0. |
| `vitest run` | 6 failed / 1209 passed / 4 skipped | 6건 전부 `essay-runtime/catalog-demand·projection·public-discovery` + 빈 `phase1-browse-snapshot`. **pristine f1a9e27 분리 워크트리에서 동일 6건 동일 실패 확인 → 선존재, 회귀 0.** 통합한 admin·MY·essay·math 컴포넌트 테스트는 모두 통과. |
| `verify-boundaries.mjs` | **PASS** | client 76 / server 2 / blocked runtime deps **0** (service-key 리터럴 위반 0). |
| `next build` (production) | **환경 제약으로 실행 불가** | 아래 참조. |

**회귀 확인 대상(로그인·PDF 열람·첨삭 결과·재첨삭·History·Credit·관리자·MY)**: 관련 테스트 모두 통과, 평가·Credit·History 로직 변경 없음.

### WEB 빌드(§5 next build) — 환경 제약
이 워크트리에서 `NODE_ENV=production next build`는 **코드가 아닌 환경 요인으로 실행 불가**:
- 프로젝트는 **pnpm 관리**(`pnpm-lock.yaml`, `packageManager: pnpm@11.24.0`)이나, 이 머신에 **pnpm 바이너리 부재**, **corepack-pnpm은 Node 20.19.5 호환성 오류**(`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`), **npm은 pnpm 스토어를 손상**(arborist `edgesOut`).
- 워크트리에 node_modules가 없어 메인 체크아웃 node_modules를 심링크하면 **Turbopack이 cross-root 심링크를 거부**("Symlink node_modules points out of the filesystem root"). Next는 cwd 내 실제 node_modules를 요구.
- 또한 메인 node_modules에 `pdfjs-dist`(materials 전용) 미설치 — tsc 4 error의 원인.
- → task의 env-fallback 조항에 따라 **tsc/eslint/vitest/boundary로 대체 검증**. 빌드 블로커는 전적으로 툴체인/의존성 환경이며 통합 코드와 무관.
- **실제 Cloudflare Pages CI**는 정상 pnpm 설치 + NEXT_PUBLIC 6개(plain-text) 환경에서 빌드하므로 그 경로에서 빌드가 수행됨. (Owner 대기: CI/배포 환경에서 production 빌드 최종 확인.)

## 7. Production 배포 준비 상태
- tsc/eslint/vitest/boundary 기준 **통합 코드 회귀 0건**, service-key 경계 PASS.
- UI-only 선별 통합. 평가·Credit·Ledger·History·Worker·Registry·DB·RPC·server-only 동작 불변.
- 미해결: (a) WEB production 빌드는 CI 환경에서 최종 확인 필요(환경 제약), (b) DB 기준 공개 문항 수(12) Owner 재확인.
- **배포·main 머지는 수행하지 않음.** 통합 PR(ready, base=`codex/material-browse-release-20261022`) 생성 후 Owner 승인 대기.

## 8. 롤백 방법
- 통합 PR을 merge/배포하지 않으면 현행 Production(**e67a0d37**)·코드 기준(f1a9e27)에 아무 영향 없음.
- 배포 후 문제 시: Cloudflare Pages에서 **e67a0d37**(현행) 또는 **40c5085a**(직전 정상)로 롤백. 두 배포 모두 보존됨.
- 통합 브랜치는 f1a9e27에서 분기 — 되돌리려면 PR close만으로 충분(main·production 브랜치 불변).

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
