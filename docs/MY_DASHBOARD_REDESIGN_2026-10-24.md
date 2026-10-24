# MY 마이페이지 Redesign — 2026-10-24

WEB 일반 사용자 마이페이지를 "입시 준비·논술 성장 개인 대시보드"로 개선했다. **UI만** 수정했고 DB/RPC/API 계약·Ledger·결제·평가 Worker/Registry·Codex 백엔드 파일과 기존 사용자 데이터는 변경하지 않았다.

## 1. 폴더·브랜치·HEAD
- Worktree: `/Users/woojinchang/development/legendstudy-lab/.claude/worktrees/web-my-redesign-20261023-00d88e`
- 브랜치: `claude/web-my-redesign-20261023-00d88e`
- 기준 Commit: `main` `8991b51` (Exclude Math voice feedback from first release) — merge-base 일치, admin/Codex 변경 없음.

## 2. 변경 화면·파일
화면: 마이페이지 허브(`/account`), 첨삭권 내역(`/account/credits`), 나의 논술 성장(허브 내 신규 섹션), LAB 카드.
- 신규: `src/components/my/profile-header.tsx`, `src/components/my/essay-growth.tsx`, `src/lib/my/essay-growth.ts` (+각 테스트)
- 수정: `src/components/my/dashboard.tsx`, `src/components/my/applications.tsx`, `src/components/my/lab-cards.tsx`, `src/app/globals.css`(MY 블록 말미 신규 스타일)
- 테스트 갱신: `dashboard.test.tsx`(섹션 순서·프로필·성장 목), `applications.test.tsx`(기본 연도·수시/정시 라디오)
- **미변경(의도적)**: `src/lib/my/{contract,data,foundation,essay-summary,essay-dashboard,evaluation-report}.ts` 등 데이터 계약, 결제/Ledger/Worker/Registry, admin 코드.

## 3. 정보 구조(§3) — MY 섹션 순서
`나의 프로필 · 내 이용 현황 · 나의 논술 성장 · 나의 학교·학년 · 나의 목표 · 나의 지원 현황 · LAB · 나의 학습시간 · 계정 및 지원`. 기존 기능/이동 경로 전부 보존.

## 4. 닉네임 연동 (P0)
- `마이페이지` 제목은 기존 축소 상태 유지, 상단에 **나의 프로필 카드** 신설.
- 카드 = 닉네임(`profiles.display_name`) / 이메일 / 학교·학년(설정 시). 미사용으로 남아 있던 뷰 계약 `myIdentity()`(contract.ts)를 연결.
- 닉네임 없으면 **이메일만** 이름으로 표시, 이메일 중복 출력 금지(`showEmail` 가드). 은은한 그림자는 기존 `--product-shadow` 사용.

## 5. 카드 디자인 (P0)
기존 `--product-border`/`--product-shadow`/`--radius-lg` 카드 시스템을 그대로 계승(흰 배경·연한 테두리·미세 그림자·제목/본문 계층·버튼 선택 상태). 신규 카드(프로필·성장·첨삭권 요약)도 동일 토큰으로 통일, 모바일 반응형·포커스 접근성 유지.

## 6. 첨삭권(Credit) 내역 페이지 (P0)
- 상단 **잔액 요약 카드**: 사용 가능 총량 명확 표시 + 무료/구매/기타 구분 + 가장 가까운 만료일 + `[첨삭권 구매]`.
- 만료일은 canonical `credit_summary().next_expiry` 값 그대로 — **무료 Credit에 구매 만료일을 오적용하지 않음**(구분별 임의 만료 생성 없음).
- 내역 표: **한 페이지 10건 + 이전/다음 페이지 이동**(클라이언트 분할, `readHistory` 계약 불변, 최대 100건 유지).
- 날짜/개수/사유 3열 유지, 내부 식별자 비노출.
- `[뒤로가기]`/`[마이페이지]`는 공용 `ReturnNavigation`으로 여백·크기·간격 통일.

## 7. 학교·목표·지원 UX (P0)
- **학교·학년 카드**: 현재 상태/학교/학년 행 사이 hairline 구분선 추가. 값 없으면 `해당 없음` 1회만(미설정 반복 없음). 기존 수정·저장 로직 불변.
- **나의 목표 대학·학과 추가**: 검색창+결과를 하나의 `my-add-panel` 영역으로 유지, 결과 행 hover 강조, 저장·취소는 입력 근처. (PC 전용 모달은 회귀 위험으로 보류, 인라인 팝오버형 유지 — GAP 아님, 기능 동일.)
- **지원 현황 입력**: 목표와 동일한 검색 컴포넌트 재사용. **입학학년도 기본값 = 다음 입학연도(`현재연도+1`, 2026→2027)** — 기존 1900 입력 하한이 기본처럼 보이던 문제 수정. **수시/정시 라디오** 도입(레거시/기타 저장값은 별도 옵션으로 보존해 저장 데이터 불변). 기존 지원 상태·결과·등록 이력 구조 그대로.

## 8. 성장 카드 (P1)
`나의 이용 현황` 바로 아래 **나의 논술 성장** 섹션 신설.
- 데이터 소스: **배포된 `my_essay_summary` RPC**(admin Student 360이 이미 소비 중) + 기존 fail-closed 파서 `parseEssaySummary`만 사용 — 신규 쿼리/테이블 없음.
- 친근 메시지: 최근 활동 대학으로 "○○대학교 논술에 도전했어요!" (대학명은 기록값 그대로, 로고 미생성).
- 학습 요약: 연습한 대학 수 · 최초 첨삭 수 · 재첨삭 완료 수 · 최근 평가 단계(최초/재첨삭 구분). 중복·실패·무효(invalidated) 평가 제외, 실제 완료 기록만.
- 상태별 UI: A 기록없음 / B 최초만(`initial-only`) / C 재첨삭완료(`reevaluated`) / D 여러 대학(`multi`) / E 평가진행중(`in-progress`). 상태 불명확 시 완료처럼 표시하지 않음.
- 순수 로직은 `src/lib/my/essay-growth.ts`(`summarizeGrowth`)로 분리, 단위 테스트 포함.

## 8-2. 성장 비교 (P1)
- 최초+재첨삭이 **둘 다 비교 가능할 때만** 단계 비교 노출.
- 비교는 기존 엄격 게이트 `comparableDimensionDelta`(contract.ts)에 전적으로 위임 — 동일 문제·기준·버전·evidence manifest, 서로 다른 attempt, 1~5단계, student 요청, 미완료/무효 제외. 통과하지 못한 쌍은 비교에서 제외(동일로 둔갑시키지 않음).
- 표시: 향상/동일/하락 **개수**와 비교 항목 수, 가장 크게 오른 단계 폭. 하락·동일도 실제대로 표기.

## 9. 대학 평균 통계 (P2) — 미구현, GAP
"함께 준비하는 학생들" 대학별 평균 작성 횟수 비교는 **운영 화면에 노출하지 않음**. 집계(유효 학생 수/1인 평균/최초·재첨삭·중복·실패 처리)는 **신규 집계 RPC와 30명 이상 표본·RLS 보장**이 필요하며, 이는 Codex 백엔드 완료 + Owner 승인 대상이다. 현재 `my_essay_summary`는 **본인 데이터만** 반환하므로 교차 집계 불가 → 가짜/Mock 수치 표시 금지 원칙에 따라 UI도 생성하지 않았다. (디자인 예시 "3.2회"는 운영 데이터로 사용하지 않음.)

## 10. 표본/개인정보 검증
- 성장 카드는 **본인 소유 데이터만**(`assertOwner` 전후 가드, 기존 RLS 경로) 사용, 집계·순위·백분위 없음.
- P2 미구현으로 타인 집계·표본 노출 경로 자체가 없음.

## 11. LAB · 학습시간
- **논술 LAB** 활성 카드 유지(`/account/essay`). **내신 LAB / 모의·수능 LAB**은 실제 미제공 → 회색 비활성 스타일 + `준비 중` 태그 + 기존 "서비스 준비 중" 안내 다이얼로그(설명 affordance 유지). 서비스 중 기능을 임의 비활성화하지 않음.
- **나의 학습시간**: 기존 `my_study_summary` 기반 차트 그대로(변경 없음).

## 12. API GAP
- `my_essay_summary`에 **criterion 라벨 없음** → "개선된 평가요소"의 **이름**은 정직하게 표시 불가. 현재는 향상/동일/하락 **개수**만 노출하고 이름별 내역은 상세(`/account/essay`, `readEssayDetail`)로 연결. 요약 RPC에 criterion 라벨이 추가되면 카드에서 직접 이름 표기 가능.
- P2 대학별 비교용 **교차 집계 RPC 부재**(위 §9).
- 그 외 프로필/Credit/학교/목표/지원/학습시간/History는 기존 계약으로 전부 조회 가능 — GAP 없음.

## 13. WEB·APP 데이터 계약 보존
`src/lib/my/*` 읽기/쓰기 핸들러, `credit_summary`·`my_study_summary`·`my_essay_summary`·`my_applications*` RPC, Ledger/결제 경로를 **호출만** 하고 스키마·인자·반환 계약을 변경하지 않음. APP과 공유하는 `profiles`/Credit/essay 테이블에 쓰기 추가 없음.

## 14. 반응형·접근성
- 신규 CSS는 `auto-fit`/`minmax`와 `max-width` 미디어쿼리로 모바일 대응(첨삭권 요약·라디오·성장 통계·프로필 facts).
- 라디오는 `fieldset/legend`, 페이지네이션은 `aria-label`+`aria-live`, 비활성 LAB은 `aria-disabled`. 포커스 outline은 기존 토큰 유지.

## 15. 검증 결과 (모두 통과)
- `./node_modules/.bin/tsc --noEmit` — 오류 없음
- `./node_modules/.bin/eslint .` — 오류 없음
- `./node_modules/.bin/vitest run` — **97 파일 / 947 테스트 통과**
- `node scripts/verify-boundaries.mjs` — `BOUNDARY_AUDIT=PASS` (blocked_runtime_dependencies=0)
- `NODE_ENV=production ./node_modules/.bin/next build` — 성공(정적 export 유지)

## 16. 회귀검사
기존 MY 테스트 전부 유지. 신규 사양으로 바뀐 `dashboard.test.tsx`(섹션 순서/프로필 식별/성장 목), `applications.test.tsx`(기본 연도/라디오)만 사양에 맞게 갱신. 신규 테스트: `essay-growth.test.ts`(5), `profile-header.test.tsx`(2), `essay-growth.test.tsx`(2). 로그인/프로필/학교·학년/희망 대학·학과/지원 현황/Credit 잔액/구매·사용 내역/논술 History/문의/계정 설정 기능 전부 보존.

## 17. Production 미배포 확인
main 병합·Production 배포 **하지 않음**. 작업은 feature 브랜치에만 존재. PR은 ready로 생성하되 병합 보류(Owner 승인 대상).

## 18. Commit · Push · Remote SHA
PR 생성 후 remote SHA 일치 확인 결과를 PR 본문/후속 기록에 남긴다. (브랜치 `claude/web-my-redesign-20261023-00d88e`)

## 19. 스크린샷
운영/사용자 세션 스크린샷은 로그인 자격이 없어 생략(가짜 생성 금지). 검증은 테스트/빌드로 수행.
