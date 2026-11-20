# 논술 관리자 기간·재진행·삭제 — 2026-11-20

DONE: Owner 명시 승인 후 운영 DB 설치·WEB/Worker 배포·관리자 UI 읽기 검증 완료. 기존 요청 재진행/삭제/보관0. 운영 mutation E2E는 승인 제외로 NOT TESTED. 정본: APP repository `wiki/admin-lab-run-management-20261120.md`.

기존 [운영 정합성 조사](operations-integrity-20261115.md), [LAB 대시보드](essay-lab-dashboard-implementation-20261115.md), [운영 상태 카드](admin-console-phase4-20261115.md)를 계승한다.

- 두 대시보드 KST 오늘/7일/30일/직접입력. 현재상태 전체기간 별도 조회. 기간 요청/current 완료/current 실패와 발생시점 재시도 사건을 구분하고 각각 마지막 갱신 표시. 신규+확인중 피드백. 숨김 포함 KPI와 deep link의 visibility=all 일치.
- `AdminRunActions`: 서버 상태 확인 후 재진행·삭제·보관/복원. 확인창에 정확 요청·상태·테스트판정·원장 표시. 동일 작업 키 재사용, 중복 클릭 금지, 실패 이유 표시, 성공 후 목록/상세/KPI 갱신.
- `/api/admin/essay-run`: caller JWT로 관리자 RPC 검증 후 기존 private Worker binding의 admin adapter 전달. client subject 미수용, 학생 API 우회 차단. 다른 API 경로/Finance/Toss 변경 없음.
- 삭제는 Owner 증거 등록 테스트 + 원장/결제·완료·활성잠금·연결결과 없음일 때만. 원장 연결/미검증 요청은 보관. 기존 hidden RPC·visible 목록 재사용; old source에서 누락된 UI를 복원.
- 재진행은 기존 reserved 실패문항 retry만. 이미 종료된 failed/completed나 불확정 pending 실행은 차단. 새 과금/재예약 없음.
- 실제 processing1/retry1은 동일 한양 e7af7e52 요청, 10/26 lease 만료·q0 완료/q1 재시도실패·reserve1 연결. 테스트 입증 없음. 실제 mutation 별도 Owner 승인 전 금지.

배포 준비 기준은 Pages969afe59이며 관리자 경로만 overlay, 학생 정적파일/최신 Worker 평가모듈/Finance Automatic/Toss LIVE 설정을 보존했다. 전체 오래된 checkout을 덮어쓰지 않았다. 새로운 DB 의존기능을 설치 없이 운영에 먼저 올리지 않는다. 운영 mutation/실결제·환불 테스트는 미수행.


## 운영 적용 — 2026-11-20

- DB: LegendStudy stlhijzpjfgwwdgunlsd / migration20261120112811. RPC3/private테이블2. 기존13테이블 행해시·함수ACL 동일, action0/test등록0.
- WEB: source1f345807 / Pages e84b1232-4991-49ef-81e0-32cdefc137ec canonical success. 관리자3경로15파일과 새 hash assets만 반영, 기존 비대상3088파일 보존.
- Worker: version9ac3b91c-dad4-4f2e-bc92-3428a2c8720e100%, deployment7e9d20c0. 기존73모듈 바이트 보존, entry fetch와 helper만 변경. 모든 binding/실행설정 불변.
- Finance Automatic/Toss LIVE·전체 Pages 설정 동일. 실제 결제/환불/Provider 실행0.
- Chrome 관리자3경로, 기간4종/KST, current1/1/0 유지, 대상 재진행 가능/삭제 차단 사유/확인창, 완료 재진행·삭제 차단/보관 버튼 PASS. 재진행 확인창 승인0. 지정 e7af7e52는 시작 전 hidden=true였으며 이번 보관/복원0.
- 권한: 실제 admin 읽기 성공; 일반회원 identity의 authenticated DB 문맥에서 capability/manage42501 ADMIN_REQUIRED. 운영 API 무인증401/위조토큰403. 일반회원 로그인 브라우저 E2E는 NOT TESTED.
- 검증: 기존 WEB2184 PASS/5 SKIP, Python21 PASS, 격리 SQL/동시성/원장보존 PASS. 운영 변경 성공 E2E는 제외 범위.
- 복구 기준 WEB969afe59, Worker27c67e48. DB rollback은 API권한만 닫고 감사/원장을 보존. 실제 복구 미실행.
- 남은 승인: 기존 요청 재진행/삭제/보관, 검증 테스트 등록 및 운영 mutation 테스트. 설치/배포 재승인 불필요.
