# 평가 품질 관리 V1 — 2026-11-25

구현·격리 검증 완료, 운영 배포는 아래 사후 기록으로 판정한다. 전체 교육적 품질 검수는 PARTIAL이다.

## 구현 및 경계

기존 /ql/와 quality_operators 권한·ql_exam_cases/detail/submit 재사용. 기본은 현재 회차이고 이전 단일 평가·수리논술은 보조 필터다. 관리자 AdminFrame을 공유하되 기존 품질 권한을 관리자 전체로 확대하지 않는다. 4개 탭, 전체 페이지 순회·70회차/118문항 연결, 대학·유형·기간·기록 필터, 문항 이동, 부모 비교, 기존 학생 WEB 렌더러 미리보기, 기존 9항목 검수 저장·정정 이력을 보존한다.

/api/admin/quality-report GET은 caller JWT로 is_quality_operator=true를 확인한 후 본문을 반환한다. 세션 없는 직접 URL401, 일반 계정403, 장애503. 서버 번들에만 보고서를 넣고 Cache-Control private,no-store. 원문 답안/평가를 Git이나 정적 파일에 복제하지 않는다. 보고서 단일 원본은 APP Wiki evidence/quality-console-report-20261125.json, scripts/sync-quality-report.mjs로 배포본 일치를 검사한다.

## 검증

최종 전체 자동 2276 PASS/5 SKIP(290 files PASS/4 skipped). Next webpack 빌드·TypeScript·Functions 컴파일 PASS. 합성 장문·2문항 실제 Chrome390/768/1440px에서 모바일/태블릿1열·PC2열, 페이지 가로 넘침 없음. 보고서 본문·문항 전환 확인. 인증된 임시 preview 페이지/API는 제거했고 next.config 원복했다. 실학생 제출·Provider·원장 쓰기0.

기존 API source81개 bytes 불변; 새 report GET+data 2개만 추가. 기존 Functions routes 그대로에 새 GET1개. 기존 학생 페이지·결제·Finance 설정 보존 배포 계획을 사용한다. 무료2 정책 안내 변경은 이번 배포에 포함하지 않는다.

## 명확한 미완료

Q01–Q15는 보고서의 기술 검토 기준이며 기존 HQP9 검수 저장과 다른 체계다. Q15 개별 지속 저장·Owner 역할 식별·판정별 실시간 집계는 미구현. 현재 이를 적합0으로 꾸미지 않고 집계 불가로 표시한다. 기존 검수 의견/정정 저장은 유지된다. 전 모집단 학생/테스트 확정, 전103문항 의미·공식배점 최종 검수, 공식 원문 한 화면 연결, Claude 이번 V1 별도 검토, 학생 실제 양OS QA는 PARTIAL/NOT TESTED다. 기존 d9c856b는 11/22 대시보드 설계이며 V1 신규 검토로 표기하지 않는다.

운영 적용 후 이 문서에 deployment ID와 실제 브라우저 확인을 추가한다.
