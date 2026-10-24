# WEB MY + 나의 논술 LAB — Owner 2026-10-24

기존 회차/관리자 수정 source8e3d3c8 운영 배포, SQL Owner 검증, 관리자 로그인 후 조회 및400px 화면 확인을 먼저 기록·commit/push(b16e46f)하고 진행했다. 사용자 원문은 Unified `90_HISTORY/2026-10-25-web-my-owner-directive.md`에 보존한다.

## 보존 검토7

1. 원래 발생/제출/완료 시점을 읽고 UI 수정 시점으로 대체하지 않는다.
2. 원본 답안·평가·학교/지원 이력을 수정하거나 재생성하지 않는다.
3. 기존 profile/target current 저장 계약만 재사용하며 지원 이벤트 revision/정정 이력 보존. 새 DB/UPDATE 정책 없음.
4. 동일 auth subject와 profiles/대학 canonical ID 사용; WEB 별도 학생 ID 없음.
5. 학습·목표·실제 지원/결과·과금 사실을 각각 유지한다.
6. 자기 계정 권한/삭제 경계 유지. 공유는 브라우저 PNG이며 답안/이메일/ID/평가 설명/비공개 근거 필드를 전달하지 않는다.
7. 동일 rubric pins의 실제 최초/재첨삭만 비교. Math 범주형 판단을 숫자로 바꾸지 않고 부족하면 그래프를 생성하지 않는다.

## 구현

- MY: 프로필→이용 현황→LAB→성장→학습 시간→목표→대학 지원→계정/지원.
- 상단 기존 profile 편집에 nickname 포함, 미입력 공란. 학교 자동 재학생/선택 학년 계약 보존.
- 사용자 명칭 크레딧 통일; DB/API/SKU/과금 정책 불변.
- 만료일은 credit_summary 권위 유지, 해당 grant Ledger 전체(1000행 미만) 조회에 성공한 경우만 실제 사용가능 만료 수량 표시. 한도/권한/조회 실패는 명시하며 임의 수량 금지.
- 성장 서비스 탭 및 저장된 동일 기준 비교 그래프. 내신/수능 준비 중. 기존 공부시간 조회 유지.
- 대학·학과 한 번에 기존 target row INSERT. 같은 대학 중복/5개 제한 보존; 신규 DB 제약 변경 없음.
- 지원 검색 한 줄, 수시 기본값, 기존2027기본 연도와 지원/결과 이력 유지.
- 분석 화면 중복 MY 버튼 제거, 안전한 기존 뒤로가기/논술 LAB 복귀 유지. 확인할 답안 선택.
- 공유는 대표주소 복사+local PNG. 기존 인쇄/PDF 유지. Math 해설/예시 공개 버튼 제거, 원본 engine/자료/서버함수 불변.

## 검증 및 한계

Typecheck/변경 Lint/Production build/boundary PASS. 관련 검사382PASS에서 문구 fixture1건 수정 후 최종 MY/관련136PASS/2skip(중복 합산 금지), 추가 닉네임 검사 실행 예정. 전체 suite 기존 catalog6fail/빈 suite1은 별도 미해결이며 전체 green을 주장하지 않는다. WEB·APP 동일 profile/target backend 코드 계약 확인; APP UI/코드 수정 없음. 실제 APP 기기에서 저장 반영 검증은 수행하지 않았다. 새 Production profile/target 변경이나 Provider/과금 호출 없이 기존 데이터 읽기로 검증한다.
