# WEB 작성 가이드 — 2026-11-20

정본: APP repository `wiki/essay-writing-guide-readability-20261120.md`.

공통 WritingGuideCard에서 기존 actions/weaknesses/nextSteps를 그대로 렌더링한다. 번호 과제, 장식 체크 기호 목록, 하단 보조 안내, 15–16px/1.7 본문. 템플릿 반복만 제거하며 저장 문장 내 같은 표현은 보존한다. DB/평가/재첨삭/APP/LIVE/Finance 변경0.

전체2175 PASS/5 SKIP, 관련228 PASS/2 SKIP, TypeScript/ESLint/production webpack build/Functions compile PASS. 로컬 실제 컴포넌트/production CSS 320·375·390·430·768·1440px 가로넘침0. 운영 배포·실제3문항의 과제1/2/2·점검각3·저장문장 일치 확인 완료. 원문PDF3/10 열기 PASS. 운영 모바일 viewport 적용 미완료로 모바일은 로컬 검증만 집계하며 실기기/실제 재첨삭 제출은 NOT TESTED.

직전 운영 Pages9201e47a, source d2d607a. API/data/routing 동일 확인; 결과 경로와 신규 hash 자산만 교체하고 그 외 경로/설정 보존. 정본에 최종 배포 영수증과 롤백 기록을 남긴다.

운영 Pages969afe59-8bf4-4940-b0a9-d32b2ac9a9ba / source d559b9b, canonical success. 변경30정적파일/신규41자산, 무관3056자산·전체설정·라우팅 불변. LIVE/Finance Automatic 유지. 직전9201e47a로 롤백 가능(후속 배포 선확인).
