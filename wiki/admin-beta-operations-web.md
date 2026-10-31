# TASK04 관리자 베타 운영 — WEB 연결

공식 상세 기록은 APP Unified Wiki `wiki/admin-beta-operations.md`다. 기존 TASK02 v2를 확장하며 별도 Credit 원장을 만들지 않는다.

- `/admin/beta/`: 기존 관리자 gate, 설정·감사 조회; 공식 관리자 + 승인 UUID만 저장. version 충돌·중복 저장 방지.
- `/admin/beta/usage/`: 사용자 UUID·기간·정렬·25행 페이지.
- `/admin/beta/failures/`: 현재 실패·예약·정산·자동 복구·수동 확인 구분. 수동 Credit 복구/재처리 버튼 없음.
- `admin-beta.tsx`, `lib/admin/beta.ts`: 기존 Supabase 세션과 공개 admin RPC 재사용. 서버 미설치/권한 거절을 빈 성공 화면으로 표시하지 않는다.
- `essay-beta-credit.tsx`: 서버 daily_limit 및 정확한 종료 시각 표시. 기존 응답은 1회로 호환.
- APP SQL 승인 후보: `supabase/candidates/essay_beta_admin_v1/`. 운영 적용·WEB 배포·실계정 동기화 검수는 Owner 승인 후 별도 수행.
- 자동 검증: WEB 1,448 PASS / 4 SKIP / 0 FAIL, TypeScript PASS, Production Build PASS, Lint 0 errors / 기존 5 warnings.
- 롤백: 승인된 관리자가 기능 비활성화하여 신규 접수를 차단. 원장·grant·감사·접수 완료 작업 보존. WEB 커밋 revert 가능; 복수 이용권 발급 후 SQL을 구버전 1회 계약으로 무조건 복원하지 않는다.
