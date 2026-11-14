# 관리자 논술 LAB 연결 — 2026-11-14

APP 공식 Wiki의 `admin-lab-operations-20261114.md`가 조사·데이터 계약 원본이다.
APP repo: LC3808/legendstudy-service-app-20261022, branch codex/operations-commercial-20261113.

WEB 기준62a3296에서 구현: 이용권 기본 최근요청순/활동 컬럼,회원별 LAB 이용 현황,
/admin/essay-runs/ 전체 회차,답안/결과 읽기 전용·원장/호출추적,기존 /ql/ 상세 deep link.
학생 렌더러 재사용,Owner API 권한 확대/평가·Credit 엔진/Provider 변경 없음.

SQL public.admin_credit_member_list 확장 + admin_lab_runs/admin_lab_run_detail R1은
Owner 직접 위임으로 운영 적용 완료. 서버 관리자·활성계정 검사,anon/service_role 실행거부.
운영58요청/47완료/10실패/1진행,베타 grant 연결1,성균관대3문항 확인.
회차·원장·발급행 해시 보존,비관리자 차단 PASS. 실제 학생 원문은 Git에 보관하지 않는다.

TypeScript,변경 ESLint,production 설정 build PASS.
전체1987 PASS/5 SKIP/11 FAIL + dashboard mock 오류1. 깨끗한62a3296의 같은 실패11/오류1 확인.
신규 관리자5·회원 격리8·기존Credit7·Quality36 관련 PASS; 격리 PostgreSQL apply/rollback PASS.
전체 테스트가 모두 통과했다고 주장하지 않는다.

운영 WEB 배포/E2E 진행 중. 기존 배포798de461/source c995178 보존.
`scripts/deployment/lab-admin-preserved.mjs`는 /admin/와 /ql/만 교체하며
기존 공개 자산/API/설정 보존과 동시 배포 drift를 검사한다.
원복: 이전 Pages deployment 복귀 후 APP 후보 rollback.sql 적용(후속 함수 drift 시 중단).

Claude 계약: admin-lab-v1 목록(summary/items/universities,total,offset,limit25),
admin-lab-detail-v1 상세(run,billing,ledger,calls,retries,diagnostics,children,reviewed_questions).
결과 열람 이벤트는 미연결(null),베타는 daily_grants 연결,무료재첨삭은 included_revision/required0.
기존 feedback 원장은 운영 존재하나 essay_feedback 전용 RPC는 미설치;신규 코멘트 원장 없음.
