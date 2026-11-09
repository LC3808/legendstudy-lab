# 관리자 UI/UX 1차 개편 — 운영 배포 기록

작성: 2026-11-09 KST · 상태: 운영 배포 완료 (Owner 실제 화면 확인 대기)

## 요약

운영 대시보드·회원 관리에 실질적 레이아웃 개선을 적용했다. teal·청회색 시스템 유지,
표현 계층(CSS·마크업)만 변경. API/RPC/DB/Worker/Functions/라우팅 불변.

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `claude/admin-ux-overhaul-20261109` |
| 기준 운영 소스 | `be3c9fe` (이전 canonical `ecbb9d8d`의 소스, b7c07d7의 조상) |
| UI 변경 커밋 | `b7c07d7` |
| 새 운영 배포 ID | **`64646bb7`** (`64646bb7-6863-4bec-9f80-3a374d6438ff`) |
| 직전 canonical (원복 대상) | `ecbb9d8d` |
| 운영 URL | https://lab.legendstudy.com |

## 변경 내용

- **대시보드** (`admin-dashboard-view.tsx`): 상단 핵심 KPI 6종(전체 가입·공부기록 회원·미처리 문의·총 공부시간·희망대학 등록·발송 실패) + 운영 경고 스트립. **KPI는 기존 admin_* / supportMetrics read 응답만 사용** — 신규 쿼리·하드코딩·임의 지표 없음.
- **회원 관리** (`admin-members-view.tsx` + `member-dashboard.css`): 계정 상태 색 칩, 표 좌측 정렬·고정 헤더·행 hover·이메일 고정폭, 필터 영역 재배치.

## 안전·보존 확인

- 조상 검증: `be3c9fe`(운영 소스) ∈ `b7c07d7` 이력 → 덮어쓰기 없음.
- `functions/`·`public/` 변경 0 → Worker/Functions/라우팅 보존. 오버레이는 `ecbb9d8d` 배포 아티팩트의 Worker 재사용.
- 권위 있는 dry-run(baseline `ecbb9d8d`): off-scope 변경 **0건**, `existingFunctionsPreserved: true`, 범위 = 관리자 HTML 30 + 글로벌/컴포넌트 CSS·JS 청크.
- 배포 후: 라이브 canonical `64646bb7`(source b7c07d7). `/admin/`·`/admin/members/`·홈·`/notices/`·`/robots.txt` 200. 운영 `/admin/members/`가 신규 CSS(`focus-kpi`·`focus-alert`·`admin-chip`) 참조 확인.

## 검증 (코드)

- TypeScript ✅ · ESLint(변경 파일) ✅ · 프로덕션 빌드 ✅
- 관리자 테스트 **7 failed / 202 passed / 1 skipped** = 베이스와 동일, **신규 회귀 0**. boundary `FAIL`(결제 문구, 베이스 기존 이슈) — 신규 아님. (지시대로 이번 범위에서 미수정.)

## Preview 인증 메모

Preview(`*.pages.dev`)는 `auth-config.ts`의 보안 가드레일로 운영 Supabase 인증이 설계상 차단됨 → 실데이터 관리자 화면은 운영에서만 확인 가능. Preview에 임시로 넣었던 공개 env 2개는 효과가 없어 되돌렸고, **인증 가드레일은 변경하지 않음**. (상세: 이번 작업 로그)

## 원복

직전 canonical `ecbb9d8d`로 재승격(CF Pages rollback). 프런트엔드 전용 → DB 원복 불필요.

## 다음

Owner가 `https://lab.legendstudy.com/admin/`·`/admin/members/`에 운영자 계정으로 로그인해
KPI 6종·경고 스트립·회원 상태 칩·검색/필터·기존 상세(Student360·Credit·학습 기록)를 직접 확인.
