# 관리자 대시보드 PHASE 4 — 2026-11-15

기준 WEB `d90e2ec`, 실제 canonical `7ea8cef7-0104-42ac-bfc2-6d317d8d624f`(source `4988cd8`) 확인. [Claude 설계 2a50926](https://github.com/LC3808/legendstudy-lab/blob/2a50926/wiki/admin-console-final-ux-audit-20261115.md)의 안 A/안 B와 Owner 보완 지시를 적용한다.

## 구현 및 데이터 계약

- DONE: 기존 KpiTile을 공통 컴포넌트로 추출, 운영 상태 4카드. 0건은 중립, 양수는 내역 확인 표시이며 장애 등급을 추정하지 않는다. 숫자·기간·상태·이동 경로를 분리했다.
- DONE: 네 수치 모두 조회 성공/정수 0일 때만 접힌 요약 제공. 오류·누락·로딩은 0으로 처리하지 않는다. 장기 미완료/결과 누락/차감 이상을 확인했다고 표시하지 않는다.
- DONE: 대시보드 기간 하나로 상단 KPI와 학습·입시 집계를 동기화. 기본 d30, 회원 구성 별도 all 유지. 동일 공부/학습 조회 중복 제거. 불완전 날짜는 RPC 미호출. 새로고침에 결제·이용권 조회도 포함.
- DONE: 기존 전체 기간 선택 유지. 회원·공부·release만 NULL/NULL 계약을 사용한다. bounded-only learning/admissions/outcomes는 호출하지 않고 미지원 안내한다. 문의는 현재 대기, 운영 카드는 고정 범위 유지.
- DONE: 가용 콘텐츠 너비 650px 미만 KPI2열, 650px 이상3열, 1200px 이상6열. 운영카드2/4열. 사이드바 너비를 고려한 container query, 기존 색/링크 유지.
- DB DDL/DML, RPC, RLS, 관리자/quality_operators, 금융/평가 정책 변경 없음. 운영 SQL은 함수 정의 읽기만 수행.

운영 함수 정의를 읽어 확인한 기간 기준:

| 항목 | 기준 및 이동 한계 |
|---|---|
| 실패 | ops run_facts의 최근7일 created_at 접수 중 현재 failed. 연결은 전체기간 실패 **회차** 목록이며 같은 범위라고 주장하지 않음 |
| 처리 중 | 전체 run_facts 중 reserved. 미완료 회차 목록으로 이동 |
| 재시도 대기 | reserved AND failed_questions>0. 처리 중의 부분집합일 수 있어 합산 금지. operations로 이동, 재시도 필터 미적용 명시 |
| 신규 피드백 | admin_essay_feedback status=new 필터 후 pending(new/reviewing) 집계이므로 실제 new만 포함 |
| 가입/대학/지원/입시결과 | 각 원천 created_at. 학습 최근열람은 viewed_at, 공부는 실제 활동 구간 교집합 |
| 결제/첨삭권 | PAID 주문 paid_at / consume 거래 created_at |
| 전공/지원 대상 학생 | 현재 프로필 스냅샷, 기간 선택으로 과거 상태를 재구성하지 않음 |

통합 경고 서버 집계는 P2로 보류. 실패·처리 중 연결의 ops/회차 범위 차이는 카드 아래에도 명시했다.

## PHASE 3 판정 정정

[PHASE3 구현·검증 기록](admin-console-phase3-20261114.md)과 현재 `admin-lab-operations.tsx`, `admin-lab-preview.tsx`, preview route를 대조했다. KPI 카드, 통합 필터, 상세6영역, 학생 결과 새 탭 미리보기는 **이미 구현/배포 완료**다. Claude 최종 감사의 해당 미구현 판정은 실제 코드 및 기존 브라우저 검증과 불일치한다. 이 작업에서는 재개발하지 않았다.

## 검증

- 집중 자동화 20 PASS: 카드4개/기간/0·양수/unknown·error·loading/정확한 링크·필터 한계/중복 설명/기간 동기화/회원 기간 독립/현재 문의 + PHASE3 목록·상세·미리보기.
- TypeScript, 변경 ESLint, Next webpack production build PASS.
- 전체 2,011 PASS / 기존 11 FAIL / 기존 1 ERROR / 5 SKIP. PHASE3 대비 신규 실패0. 기존 실패7파일: admin-analytics2, admin-console4, catalog-demand-projection/catalog-demand/public-discovery/university-theme/materials 각1. admin-console mock study.total 누락 오류 유지. 실제 운영 데이터 이상으로 해석하지 않는다.
- 실제 브라우저/배포 후 검증: 진행 중. 미수행 검증은 아래 최종 기록으로 구분한다.

## 배포 계획 및 원복

기존 배포 절차로 `/admin/` 루트 HTML/RSC와 새 해시 자산만 갱신. 다른 페이지 자산 2,881개 보존 계획 검증. 기존 API 소스(functions/cloudflare/lockfile) 차이0, Functions route config 동일. 임시 이전 Worker 바이너리 백업이 남아 있지 않아 동일 소스를 기존 Wrangler로 재컴파일했다. 이번 Worker SHA256 `eb21ec0e874335c06732df5d39b9c6a1ab63527286040b6d274e9f7b1f27b890`; 과거 바이너리 해시와 같다고 주장하지 않는다. 운영 환경값/권한 변경 없음.

원복은 기준 canonical `7ea8cef7`로 Pages rollback, DB 원복 불필요. 배포 직전 canonical/설정 drift를 검사하여 타 작업자 변경 시 중단한다. Force push 없음.
