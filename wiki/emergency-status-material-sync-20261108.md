# 2026-11-08 긴급 장애 복구

## 논술 대학 카드 — 운영 복구 PASS

인증 상태에서42개 대학이 공통503이었다. 직접 원인은 중앙2021~23의11개 시험이
승인된 수학Q1~Q3만 공개하는 반면 Catalog는 과학Q4까지 포함하는데,
public-service-status가 전체문항 동일 개수로 간주해 WHOLE_EXAM_CHANGED를 발생시킨 것.
RPC 부재/전체 공개 권한 부족이나 MAX_PUBLIC_EXAMS256 초과가 원인이 아니다.
실제 배포 기준 제한은512였다. 익명API401은 기존 인증 정책이며 변경하지 않았다.

수정 SHA918661cf0e2b2ed1bb5e1aafc8fe3e7cf4e577af:
해당11시험에 정확한 catalogQuestionIds4개를 명시하고, 공개 questionIds3개를 유지한다.
Catalog 누락/추가 drift 검사는 그대로 유지한다. 과학Q4나 미공개 시험 활성화0.
기존 Registry/Evidence/엔진/DB/원장 변경0.

운영 Pages 배포e2ea3191-e1f1-471f-9ad3-bc7e3f330829 (11/8 16:15KST).
기준배포ce3e336c-5ccb-4f1b-b833-06234ac125c1/source391ed0b의 정적2334파일을
해시 그대로 보존하고 Functions만 교체했다. 환경·공개범위·Preview·서비스 binding 동일.
focused29+regression55=84 PASS, TypeScript/Functions compile PASS.

실제 인증 WEB42카드: 오류0/이용가능15/기존 보류27.
대표 자연: 한양2027모의Q1~Q2, 건국2026수시Q1~Q4, 경희2026수시논제I~III.
상경: 한양2027모의2문항. 사회: 경희2026수시3문항. 인문: 한양2027모의1문항.
각각 문항/답안 작성 화면·PDF 열람 확인. PDF 페이지수 각각2/4/2/2/7/3.
빈 답안 상태에서 평가 실행0, 답안 저장0, 실제 이용권/결제 동작0.
조회/진입 PASS를 새로운 Provider 평가 품질 검증으로 간주하지 않는다.

원복: 이전 보존된 Pages 배포로 복귀할 수 있으나 공통503이 재현될 수 있다.
새 공개 범위를 강제로 지우거나 기존 DB를 되돌리는 원복은 하지 않는다.

## 생활과 윤리 원본1618 — 운영·APP67 PASS

원본 최신 게시글 기준 문제7hOKZ/btsH1DtW933, 해설qDjj2/dJMcafISWxm.
기존 문제UUID9a50b598-df2f-5573-aaad-4d81921d0a31 보존.
삭제된 중복UUID78960745-ee6a-5045-842f-08738ac1fe44 비활성화만 수행.
신규 해설UUIDc8761509-f6d0-56d8-999c-16407683d7fd 기존 과목에 연결.
Owner 승인 [apply.sql](../supabase/candidates/material_1618_20261108/apply.sql) 적용 완료.
[rollback.sql](../supabase/candidates/material_1618_20261108/rollback.sql)은 신규 해설 비활성+
중복 재활성으로 표시만 되돌리며 ID/참조는 삭제하지 않는다.

격리 적용·재실행·원복 PASS. 운영 원본 resources44→45행,
기존44행 중 변경1(중복is_active), 누락0. 기존 문제/다른 자료/원장 보존.
Owner가 APP67에서 두 파일 표시·열람 정상 확인. 앱 코드/빌드 변경0.

## 일일 자동 갱신 — 구현 후보 / 운영 승인 대기

운영 DB Cron·APP/WEB GitHub Actions·로컬Cron에 기존 자료 스케줄 없음.
Owner도 별도 운영 위치 없음 확인. 기존 수집기 재사용 실제 일일 실행 지시.
APP 작업 공간 materials-daily-sync-20261108의
wiki/materials-daily-sync-20261108.md가 구현·격리 검증·운영 승인안/원복의 상세 근거다.
기존 자료450건 재확인+최신 신규 최대30건,03:17KST GitHub Actions 후보.
전용 DB role/비공개 실행로그/자료 UPDATE 후보는 아직 운영 미적용.
수동 자료 복구를 자동 갱신 완료로 보고하지 않는다.

APP67을 유지한다. 이 서버 복구에 새 IPA/AAB는 필요 없다.
전체 긴급 작업 판정은 PARTIAL(정기 자동 경로 승인·실행 확인 대기).
스토어 제출/신규 앱 RELEASE_READY 판정은 이번 작업에서 수행하지 않았다.
