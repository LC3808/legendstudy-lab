# 2026-10-24 Owner 검수 수정 — 진행 중

이번 범위는 관리자·작성/제출·History·결과·재작성·성장 비교 전체다. 일반 MY 추가 검수는 별도이며 이 작업의 대기 사유가 아니다. 본 문서는 실행 증거/계약 검토이며 Unified Wiki의 대체 Authority가 아니다.

## 데이터 보존 검토 (7문항)
1. 기존 created/submitted/completed 시점을 그대로 사용. 화면 변경을 새 발생 사실로 기록하지 않는다.
2. 원본 답안·문항/시험 ID·평가 pin·Ledger를 수정하지 않는다.
3. 재작성은 기존 parent/run 연결을 사용하며 과거 결과 UPDATE/삭제를 하지 않는다.
4. 동일 auth.users owner 검증 및 기존 관리자 권한·개인정보 경계를 유지한다.
5. 학습 평가/결제 운영 사실과 진학 결과를 혼합하지 않는다.
6. 기존 owner/admin 읽기 계약만 사용하고 신규 수집·외부 전송·bulk PII 조회를 추가하지 않는다.
7. 성장 그래프는 동일 평가 기준의 저장된 단계만 표시한다. 빈 값은 0/긍정 판정으로 바꾸지 않는다.

## 확인된 계약 차이
- 기존 exam reserve는 문항 배열 전체에 1 Credit을 예약하며 free parent는 0이다. 서버에 문항별 예약을 추가하지 않는다.
- WEB ScopedExamSubmit은 선택 탭 하나만 넘기던 상태였다. 작성된 회차 답안을 모으는 변경 진행.
- 실제 Worker 소스 cloudflare_runtime.py는 len(questions)==1 제한을 갖는다. async_exam.py도 다문항 summary 함수를 요구하며 현재 호출에는 없다. 프런트 묶음 변경만 Production 배포하면 안 된다.
- async_exam.py는 한 문항 실패 시 final.failed를 저장하고 회차 finish를 호출한다. 실패 문항만 재처리하려면 checkpoint/lease/terminal/정산 계약을 함께 검토해야 한다. 성공 결과 삭제·새 과금 key로 우회 금지.
- exam 제출 계약은 텍스트만 허용한다. 이미지 Draft는 기존 IndexedDB에 보존하지만 이미지 시험 첨삭과 Math 단독 과금 경로를 회차 계약으로 통합한 상태가 아니다.
- 최초 미제출 문항을 재첨삭에 추가하는 정책은 미정. 기존 정확한 문항 집합 제한 유지.
- 공개12는 인문 Essay11 + 별도 Math1이다. 인문11을 전체12와 비교해 누락1로 해석하지 않는다.

## 운영 조회 계약 확인
로컬 admin-v1은 기간별 전체 Credit 거래/상품별 매출/Registry 집계를 노출하지 않는다. 결제는 query/state/limit/offset, Credit은 account_id/limit/offset이다. 페이지 합계를 전체 통계로 대체하지 않는다.
운영 함수 정의가 이 체크아웃에 없으므로 [read-only-preflight.sql](read-only-preflight.sql)을 Owner가 실행하여 실제 정의/필드 확인 필요. 이 파일은 변경 SQL이 아니며 INSERT/UPDATE/DDL/금융 작업이 없다. 확인 후 정확한 새 조회 계약·검증·복구 SQL 작성.

## 배포 조건
이 작업의 Production 배포는 아직 하지 않았다. 기준 배포6b69acb3-f497-48e4-8f79-559fc82a7b95 / 코드a21642cf384adc69fa5c6ec6180c3ea7c4987cd2 유지. 통합 완료·검증 전 부분 배포하지 않는다. 복구 기준도 이 배포이며 Secret/Worker/DB 변경 없음.

## 필요한 서버 변경 범위 (운영 미적용)
- 기존 `CloudflareExamRuntime.consume`의 단일 문항 제한을 회차 실행으로 교체. 문항별 Provider/독립검수/평가 프로필은 그대로 재사용하고 새 평가 엔진을 만들지 않는다. 종합 영역은 검수된 문항별 결과를 표시하며 임의의 회차 점수를 생성하지 않는다.
- 기존 DB journal에 문항별 성공/실패를 보존하고 terminal 실패를 새 과금 run으로 바꾸지 않는다. 재처리는 확인된 실패 문항만 새 dispatch lease로 실행하며, unknown은 reconciliation으로 보존한다. 성공 checkpoint는 다시 호출하지 않는다.
- 기존 회차 decision_id를 유지한 재처리 RPC가 필요하다. 과거 failed/released decision을 무조건 재사용하거나 신규 reserve로 우회하면 안 되며, 운영 함수/정산 상태 정의 확인 후 정확한 SQL 및 local PG 동시성 검증을 작성해야 한다.
- Math 단독 leaf 제출과 이미지 입력의 회차 계약 연결도 필요하다. 단순 반복 호출/클라이언트 Credit 보정은 금지한다.
- 초기 미제출 문항 추가는 Owner 정책 확정 전 차단 유지. 기존 성공 데이터 migration/backfill/삭제 없음.

초기 지시의 Worker 변경 금지와 최신 회차 계약 복원 지시가 만나는 범위다. 이 부분의 실제 Worker 조정은 범위 확인 전 실행하지 않으며 Production SQL은 계속 Owner 직접 실행이다.

## 항목별 현재 상태 (완료 보고 아님)

| Owner 항목 | 로컬 결과 | 남은 검증 / 차단 |
|---|---|---|
| 관리자 KPI·기간 | 운영 KPI 우선 배치, 만료 Credit 하위, 직접 선택 입력 | 전체 기간 집계·누적 공부시간·장애·Registry RPC 운영 정의 필요 |
| 회원 관리 | 학교/상태/전공 미설정은 빈칸, 기존 권한/상세 유지 | 운영 화면 검증 |
| Credit 종류×기간 | 기존 지급/회원별 Ledger 조회 보존 | 전체 거래 종류·기간 aggregate RPC 부재, Owner 운영 정의 필요 |
| 결제 | 실제 전체 조회가 확보되는 경우 1/3/5/10회권×상태×한국 날짜 기간 및 완료 건수/금액 연결 | 최대50건 초과 시 기존 페이지 조회 유지·통계는 미연결 명시; 확장 서버 조회 필요 |
| 회차 첨삭 | 작성분 수집·부분 확인 모달·빈 답안 차단 | Worker 단일문항 제한. 다문항은 Pages에서 예약 전409로 차단하는 보호 추가. 회차 기능 완료 아님 |
| 답안 저장 | 명시적 저장·기존 text/image Draft 재사용·저장 실패 제출 차단 | 이미지 저장은 브라우저 보관, 이미지 회차 평가 미지원 |
| 중복/재처리·정산 | 기존 idempotency 보존, 실패 후 새 과금 key 버튼 제거 | 실패 문항만 재처리/동일 decision 유지 서버 계약 필요 |
| 재첨삭 | 기존 parent/정확한 문항 집합 및 0Credit quote 유지 | 운영 실첨삭 추가 실행하지 않음. 새 문항 추가 정책 미정 유지 |
| History/성장 | 회차 기준 그룹, 성장 카드·실제 parent/latest 동일 rubric 그래프, 검색 기본 펼침·초기화 제거 | 과거 Math/legacy 시험 ID 없는 기록은 회차 수에서 제외. 서버 미작성/partial 결과 계약 미완료 |
| 결과 상단 | 시험 정보 카드·중복 제목 제거, known metadata 미작성 문항 표시 | 운영 결과 화면 검증 |
| 음성 | 종합평가 대표 버튼, 반복 세부 버튼·기술 안내 제거 | 기기 음성 기능 회귀검사 PASS |
| 피드백/평가근거 | 잘한 점 중복 제목 제거, 반복 action 정리, 실제 기준/의견 분리·내부 참조 수 제거 | 피드백 없음은 긍정으로 단정하지 않음 |
| 비교/디자인 | 외부 접힘/내부 펼침, 실제 단계 meter 그래프·카드/테두리/여백 | 실제 로그인 화면·모바일 검증 필요 |
| 사용자 용어 | 기존 금지 용어 노출 영역 보존 차단, 문장 수정 예시 노출도 제거 | 전체 운영 화면 최종 검수 필요 |
| 배포/완료 | Typecheck/Lint/Boundary/Production Build 및 관련 검사 수행 | **통합 미완료, Preview/Production 추가 배포 없음. 부분 완료로 종료하지 않음** |

## 검증 증거
- 관련 WEB 검사257 PASS /2 skip + 결제 조합 필터 검사2 PASS = 총259 PASS /2 skip. gateway 보호+제출 모달 검사 포함.
- 실제 PostgreSQL17 임시 DB의 기존 Ledger 계약14 PASS: 동시 중복8요청/원자 정산/무료재첨삭/기존 성공/불명 재확인/원본 함수 보존. 실제 Production DB 검증 또는 다문항 Worker 성공을 뜻하지 않는다.
- 1/2/4문항 UI는 단일 quote/단일 submit payload 검사, 부분 확인 전 submit0·취소 submit0·빈 답안 quote0·무료 quote0. 현재 운영 gateway 다문항 차단이 있으므로 실서비스2/4문항 완료로 보고하지 않는다.
- Production용6개 기존 공개 빌드변수로 static export PASS. Secret 값 변경/저장/출력 없음.
- 로컬 실제 브라우저에서 빌드된 LAB 탐색 화면 확인. 인증·Worker 없는 로컬 환경의 결과/관리자 화면을 검증 완료로 간주하지 않는다.
- APP wiki handoff PASS: current-status11951bytes/1726links. 기존 미커밋 사용자 파일 보존.
