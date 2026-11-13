# 경희 모의4·과학18 운영 공개 — 2026-11-13

**공개287 / 잔여21 / 전체308.** 경희2022모의4는 11/12 공개, 과학18(경희12·서울여6)은 11/13 공개 확인. 이화87 DONE/CLOSED 유지.

- 과학 migration `20261113013507_science18_reviewed_runtime_public` 10:40:29 KST COMMITTED. 신규 자료12행, 기존 review2개 revision 전진; 원 revision 및 사용자 기록 보존.
- Worker `27c67e48-5526-46a6-a7e8-1aab3218016e`; 기존68모듈 보존, science-reasoning-v1을 기존 결과·재첨삭 흐름에 연결.
- Pages `68e2172b-802d-4d07-ad6a-0aa205824cd7`, 배포 source `f99135ce02abe67c8d0af3152872026ac2297760`.
- 기존 비논술 정적2,212개·API소스·Preview/기타 설정 보존. public367/beta197/Math436. 실제 공개catalog5시험22entries(과학18+기존수학4), DB preflight5 및 기존Math436 보존 PASS.
- 기존 함수358개 body 불변, 전체362개 identity/ACL·RLS274·relation127·private history13테이블 보존. 3개 제출 RPC는 science 유형만 추가, runtime_policy5개시험 추가. Credit·결제 정책 변경0.
- 공식 source13개/문제PDF7개 연결. 누락private원본4개만 hash검증 업로드, Storage 정책 변경0. 일반 사용자 문제PDF7/익명0, 신규 내부4 비공개.
- WEB62 PASS/build PASS. 공통 Worker45 PASS. Flutter19 PASS/5 SKIP. 격리 PostgreSQL 적용·이력 보존·재적용 차단·원복, 공통 Ledger/History의 science 제출·결과·무료 재첨삭·Credit 계약 PASS.
- 실제 브라우저 로그인 제출·결과·재첨삭/실기기/AI품질 **NOT TESTED**, Provider0. Owner 통합 AI 검수 별도.
- 잔여21: 성균15 Owner HOLD·항공5 공식불일치·숭실1 배점불일치. 중앙과학11은 기존분모 밖 HOLD 유지.

검수: https://lab.legendstudy.com/essay-lab/ → 대학/시험/문항 → 기존 답안/결과/재첨삭. APP도 동일 Backend/Native UI 사용.

원복: 동시배포 변경 없음 확인 후 scoped WEB환경 복원+이전 Pages b791314f, 이전 Worker c3795154 복원, APP candidate essay-rollback.sql로 신규5 runtime admission 차단. 신규·기존 자료/사용자 이력 삭제하지 않음. DB 원복 격리 PASS, 실제 운영 원복 미실행.

APP 구현·전체287 검수 목록·문항별 공식자료·잔여21·상세 영수증: legendstudy-app branch `codex/essay-natural-expansion-20261111`, source `c1fb080`, Wiki `wiki/essay-khu-mock-science-20261112.md`, 후보 `supabase/candidates/khu_mock_science_20261112/`. Git Push 후 브랜치 HEAD로 최종 기록 확인.
