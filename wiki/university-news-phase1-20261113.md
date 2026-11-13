# 대학 소식 PHASE 1 — 구현 진행 중

상태 PARTIAL. 운영 배포·Flutter 연결·RPC 구현은 미완료다.

운영 SELECT: public.university_news_feed 함수 0개. 대학 뉴스 테이블 0개. 따라서 함수 인자/반환/실행권한/RLS는 존재하지 않는다. 기존 Flutter는 (uuid[],offset,snapshot) 계약을 호출하므로 준비 문구를 표시한다.

기존 /api/essay/catalog에 universityNews 필드를 추가했다. 기존 응답 필드는 유지하고 기존 42대학 Catalog에서 학년도·전형·계열·날짜/시간 원문·공식 확인상태·확인일·출처를 제공한다. 원문 날짜를 임의 확정 시각으로 변환하지 않는다. 일정 원문 부재는 UNCONFIRMED이며 미발표로 단정하지 않는다. 공통 원본을 사용하고 APP에 JSON을 복제하지 않는다.

검증: 관련 API 테스트 9 PASS. 신규 코드 운영 미배포. Flutter·실기기·실제 운영 응답은 NOT TESTED.

식별자: 기존 29 UUID 보존. 미연결13의 영문 source slug는 운영 Registry에 동일 slug가 없었다. 전체 Registry SELECT 결과 일부 대학은 kr-UUID 형식 slug로 존재함을 확인했다. 이름 유사도로 매핑하지 않았다. 기존 수집 Registry의 학교 코드/공식 출처와 대조 후 명시적 매핑 보완이 필요하다. Registry 신규생성0.

남은 구현: 기존 대학 Registry 원천 대조 → 최소 RPC/공통 Catalog 갱신 계약 확정 및 격리 검증 → 기존 Flutter 카드 연결·중복제거·오류·계정분리 → 운영 적용·조회 → 실기기 검증. 이후 PHASE2 서버 페이지네이션, PHASE3·4 명세. 이 기록은 완료 보고가 아니다.
