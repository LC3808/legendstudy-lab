# 관리자 셸 색상 일관화 (teal) — 통합·검증 기록

작성: 2026-11-08 KST · 상태: 통합·검증·권위 있는 dry-run 완료, **운영 배포(--apply) 미실행 (Owner 최종 승인 대기)**

## 요약

운영 대시보드는 이미 teal·청회색 테마(`member-dashboard.css`)를 쓰는데, 관리자 셸
(`admin-ql.css`)만 제품 오렌지 `--accent`를 상속하고 있었다. `.admin-page` 범위에서
accent 토큰만 teal로 재정의해 셸을 대시보드와 통일했다. CSS 전용, 최소 변경.

| 항목 | 값 |
| --- | --- |
| 통합 브랜치 | `claude/admin-ui-reintegration-20261108` |
| 기준 운영 소스 | `fbe4a4b` (`codex/emergency-status-sync-20261108`) |
| 통합 SHA | `be3c9fe` |
| 변경 파일 | `src/app/admin-ql.css` (+18줄, accent 토큰 3개) |
| 현재 운영 canonical | `dc2190df` (소스 `fbe4a4b`) |

## 보존 확인

- `fbe4a4b..be3c9fe` diff = `admin-ql.css` 단일 파일. `functions/`·`public/` 변경 0건
  → Worker·Functions·라우팅·API/RPC·관리자 컴포넌트 전부 보존.
- 권위 있는 dry-run(최신 baseline `dc2190df`): off-scope 변경 0건,
  `existingFunctionsPreserved: true`. 범위 = 관리자 HTML + 글로벌 CSS 청크.
- 현재 운영 Worker 번들 = `dc2190df` 배포 아티팩트(`compiled/index.js`, 993,810 bytes)
  재사용 → 배포 시 Worker/라우팅 바이트 보존.
- 의미색(`--green`/`--gold`/`--danger`/`--warning`)·네이비 활성 상태 유지. `/ql` 무관.

## 알려진 기존 이슈 (이번 변경과 무관 · Owner 지시 §10 기록)

로컬 체크아웃(운영 소스 `fbe4a4b`)에서 아래 테스트·검사가 실패한다. **셸 색상 변경을
stash한 클린 상태에서도 동일하게 재현**되므로 본 변경이 유발한 것이 아니라 **기준
커밋의 기존 상태**다. 근본 원인은 본 작업 범위 밖이며, 기존 이슈로 기록한다.

관리자 테스트: 전체 210개 중 **7 failed / 202 passed / 1 skipped** (+ error 1):

1. `admin-analytics.test.tsx` — keeps missing RPC distinct from zero and reuses existing quality routes
2. `admin-analytics.test.tsx` — unmounts private reports on logout
3. `admin-console.test.tsx` — AdminDashboardView: renders observed metrics and marks an uninstalled subsystem
4. `admin-console.test.tsx` — AdminMembersView: loads a bounded directory immediately with total count and school names
5. `admin-console.test.tsx` — AdminMembersView: passes search, status, grade, sort and server offsets without filtering page rows
6. `admin-console.test.tsx` — AdminMembersView: lists a member and opens the detail with credit history
7. `dashboard-focus.test.tsx` — shows small cohorts, N수, hours/minutes and puts admissions above operations

Boundary 감사: `BOUNDARY_AUDIT=FAIL` — "checkout must not narrate the test environment to a buyer" (결제/checkout 문구 관련, 관리자 셸과 무관).

본 변경 적용 전후 결과가 동일(7 failed / 202 passed; boundary FAIL 동일)하다.

## 검증 결과 (본 변경)

- TypeScript ✅ · ESLint ✅(사전 존재 warning 1건, 무관) · 프로덕션 빌드 ✅(공개 키 임베드 확인)
- 신규 테스트/boundary 실패 0건.

## 다음

Owner 최종 배포 승인 시: 최신 canonical 재확인 → `material-sync-admin-preserved.mjs`
오버레이 `--apply`(baseline = `dc2190df` 아티팩트) → `/admin/`·`/admin/members/` 검증 →
배포 ID·SHA 기록. 원복: 직전 canonical `e2ea3191`로 재승격(프런트엔드 전용, DB 원복 불필요).
