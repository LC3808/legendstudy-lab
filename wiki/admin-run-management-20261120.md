# 논술 관리자 기간·재진행·삭제 — 2026-11-20

PARTIAL. WEB 구현·격리 SQL/Worker/API 검증 완료. 새 DB 설치 방식 Owner 확인 대기; 운영 DB/WEB/Worker 미반영, 기존 요청 변경0. 정본은 APP repository `wiki/admin-lab-run-management-20261120.md`이며 DB 패키지도 APP `supabase/candidates/admin_run_management_20261120/`에 있다.

기존 [운영 정합성 조사](operations-integrity-20261115.md), [LAB 대시보드](essay-lab-dashboard-implementation-20261115.md), [운영 상태 카드](admin-console-phase4-20261115.md)를 계승한다.

- 두 대시보드 KST 오늘/7일/30일/직접입력. 현재상태 전체기간 별도 조회. 기간 요청/current 완료/current 실패와 발생시점 재시도 사건을 구분하고 각각 마지막 갱신 표시. 신규+확인중 피드백. 숨김 포함 KPI와 deep link의 visibility=all 일치.
- `AdminRunActions`: 서버 상태 확인 후 재진행·삭제·보관/복원. 확인창에 정확 요청·상태·테스트판정·원장 표시. 동일 작업 키 재사용, 중복 클릭 금지, 실패 이유 표시, 성공 후 목록/상세/KPI 갱신.
- `/api/admin/essay-run`: caller JWT로 관리자 RPC 검증 후 기존 private Worker binding의 admin adapter 전달. client subject 미수용, 학생 API 우회 차단. 다른 API 경로/Finance/Toss 변경 없음.
- 삭제는 Owner 증거 등록 테스트 + 원장/결제·완료·활성잠금·연결결과 없음일 때만. 원장 연결/미검증 요청은 보관. 기존 hidden RPC·visible 목록 재사용; old source에서 누락된 UI를 복원.
- 재진행은 기존 reserved 실패문항 retry만. 이미 종료된 failed/completed나 불확정 pending 실행은 차단. 새 과금/재예약 없음.
- 실제 processing1/retry1은 동일 한양 e7af7e52 요청, 10/26 lease 만료·q0 완료/q1 재시도실패·reserve1 연결. 테스트 입증 없음. 실제 mutation 별도 Owner 승인 전 금지.

배포는 현재 Pages969afe59 기준 관리자 경로만 overlay, 학생 정적파일/최신 Worker 평가모듈/Finance Automatic/Toss LIVE 설정을 보존해야 한다. 전체 오래된 checkout을 그대로 배포하지 않는다. 새로운 DB 의존기능을 설치 없이 운영에 먼저 올리지 않는다. 운영 mutation/실결제·환불 테스트는 미수행.
