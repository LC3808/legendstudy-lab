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

## 검증 및 한계 — 2026-10-25 최종

- Source `79040d6497d5a756ff76f9121cf90cf94c156f01`, Preview `2d683be3`, Production `7f9defb7-9e6e-4e50-ae52-fd256ba1d43c`. Cloudflare canonical deployment API success/source/clean 확인. [배포 증거](my-deployment.json).
- Typecheck, 변경 Lint, Production build, boundary(85 client/2 server), GitHub audit PASS. 전체 suite1249 PASS/6 FAIL/4 skip +빈 suite1. 기존 catalog-demand-projection3/catalog-demand2/public-discovery1 및 phase1-browse-snapshot 빈 suite는 미해결이며 전체 green 아님. 최종 성장 privacy/관련49 PASS/2 skip, 닉네임·결제 관련15 PASS. 중복 합산하지 않는다.
- 실계정 MY 8개 영역 순서, 기존 프로필/크레딧/목표/지원/성장 조회 확인. 400px에서 scrollWidth400, 프로필 편집 닉네임/학교/학년 표시 후 저장 없이 취소. 분석500px에서 scrollWidth500, 복귀 버튼/확인할 답안 선택/공유 확인.
- 대표주소 clipboard 실제 값 `https://lab.legendstudy.com` 확인. 운영 UI로 PNG 다운로드 후1080×3185 렌더 확인. 저장된 실제 비교만 표시; 공개용 평가 항목 allowlist 외에는 평가 항목 N. 이메일/계정ID/답안/내부 평가 설명은 PNG에 전달하지 않는다. 최신 비교 기본 펼침, 나머지 접힘.
- 현재 계정에 만료 예정 grant가 없어 양수 만료 수량은 단위검사로 확인했다. 데이터 조회 실패/한도 도달 시 수량을 만들어내지 않는다.
- WEB·APP 동일 profile/target backend 코드 계약 확인; APP UI/코드 수정 없음. 실제 APP 기기에서 새 저장 반영 검증은 미수행. 실계정 profile/target/application 쓰기 및 Provider/과금 호출은 하지 않았다. 일부 추가 폼 브라우저 입력은 도구 timeout으로 완주하지 못했으며 해당 폼은 컴포넌트 검사로 확인했다. 이번 최종 시각 검증은400/500px이며 넓은 PC viewport 재검증은 미수행.
- 관리자 검수: 기존 관리자 로그인으로 기간/회원/크레딧/TEST결제 필터와400px 확인 완료. 기존 dashboard 총회원12와 directory13 차이는 별도 계약 확인 GAP으로 남는다. 기존 공개 문항/평가 품질 보류 및 LIVE결제OFF는 이 작업 완료와 별개다.

## 보존 및 후속

이번 MY 변경에서 DB/SQL/Worker/Secret/Ledger/APP 코드는 변경하지 않았다. 기존 회차/관리자 SQL Owner 검증과 Worker17b3bd65는 유지한다. 실제 다기기 저장 동기화, 넓은 PC 화면 재검수, 기존 catalog 실패 및 관리자 총회원 차이는 후속 검증 대상이다. Owner가 아직 제공하지 않은 추가 첨삭 화면 요구는 구현하지 않았다.

## 2026-10-25 후속 — 세로 막대와 정확한 평가명

Owner 후속 지시에 따라 MY/분석 성장 비교와 PNG를 최초·최근 세로 막대로 통일했다. 기존 제한된 명칭 allowlist가 실제 평가명을 번호로 바꾸던 동작을 제거했다. 짧은 원래 제목은 유지하고, 확인한 긴 공식 평가 질문은 의미를 보존한 표시 별칭(입장 요약의 정확성, 논리적 구성과 전개, 통계 해석의 타당성 검토 등)으로 표현한다. 미등록 기준은 임의의 역량명으로 만들지 않는다.

보존7: 새 사실 발생/수집 없음; 원본 평가와 시각/pins 보존; UPDATE 없음; 동일 owner 조회 유지; Learning 표시만 변경; 기존 개인정보/공유 필드 제한 유지; 파생 명칭/그래프는 표시 전용이며 DB에 저장하지 않음.

Source651479b, Productioneba32637-25f3-4d36-bec9-c3acaf4fd99e canonical API success/clean source 확인([증거](growth-deployment.json)). Typecheck/Lint/build PASS, 관련90PASS/2skip. 실계정19개 비교 기준명 확인,1752px PC scrollWidth1752 및 세로막대 시각 확인, PNG1080×3820 다운로드·렌더 PASS. 기존 점수/ID/원본답안·DB·Worker·APP코드 변경 없음. 이전 전체suite/다기기 검증 한계는 그대로다.
