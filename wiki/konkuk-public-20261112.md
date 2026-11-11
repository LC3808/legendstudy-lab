# 건국대 자연 6시험·24문항 공개 연결 — 2026-11-12

Owner의 실제 사용자 공개 승인에 따라 운영 소스3ca5ccb에서 분리했다. 기존 건국4문항·다른 공개 대학·관리자·결제·Auth를 보존한다. 새 엔진/RPC/Storage 정책은 없다.

Source Registry5신규/1기존 ID연결, expansion6추가. 기존 입력/PDF24는 그대로 재사용한다. 공개 허용 목록은 DB와 Pages에서24leaf/6시험만 추가한다. 배포 스크립트는 현재 운영 manifest를 보존하고 논술 페이지 및 새 정적 의존성만 덧붙인다. 기존 Functions 소스/라우팅·Secrets·Preview 설정은 불변이다.

검증: 관련381 PASS/1 SKIP, TypeScript·변경 파일 lint·Next production build·Functions compile PASS. 실제 AI 품질은 전체 대학 후 Owner 통합 검수. Provider 반복 호출하지 않는다.

운영 적용/실제 공개 결과는 적용 영수증 확인 후 기록한다. Canonical: APP wiki/essay-konkuk-public-20261112.md.
