# 학습자료 동기화 관리자 UI — 추가 승인 후보

Canonical: APP wiki/materials-daily-sync-20261108.md와 supabase/candidates/materials_sync_admin_20261108/README.md.

- 기존 AdminSurface, admin_operator/account_private.allowed, Supabase browser session 재사용.
- /admin/material-sync/ 및 운영 점검 메뉴. 지금 갱신, 대기/실행/완료,72시간·실행시각·변경 건수·보류/오류.
- 브라우저에는 GitHub/DB 비밀값 없음. 수동 요청은 private queue, 동일 GitHub runner가5분 점검에서 소비.
- 기존 공개 Functions/논술 상태/비관리자 페이지/환경은 보존하는 선택 배포. 운영 기준 e2ea3191-e1f1-471f-9ad3-bc7e3f330829.
- 화면·공통 메뉴21테스트,타입,lint,운영 공개 설정을 사용한 Next 정적 빌드 PASS.
- 이전 admin-console4실패는 변경 전c2f234e에서도 동일. 현재 UI 계층과 맞지 않는 오래된 fixture/레이블 기대값이며 전체 WEB 회귀 PASS로 보고하지 않음.
- SQL·권한·WEB 추가 Owner 승인 전, 현재 미배포. 정기/수동 운영 E2E는 적용 후 수행.
- 원복은 추가 RPC 회수/worker 중지 후 이전 Pages 배포. Ops/Registry/사용자 참조 삭제 금지.
