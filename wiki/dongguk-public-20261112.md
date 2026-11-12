# 동국대학교 자연·수리 운영 공개 · 2026-11-12

상태: 적용 전 검증 완료. 운영 결과는 후속 절에서 확정한다. 대상7시험21문항 중 **20문항 공개 연결, 2026모의Q1은 공식 수정본 불일치 HOLD**로 범위를 한정한다. 숙명16시험44문항은 Owner 확인 DONE, 기존6 보존. 다음 대학은 광운대.

## 범위·공식 자료

[정확7시험/20문항/leaf 및 SQL SHA](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/scope.json). 기존 Registry ID 유지.2022/23/24모의의 hash형 Source ID는 기존3개를 대조해 재사용하며 새별칭·중복시험을 만들지 않는다. Math8테이블253행+기존privateWorker자료20행=273행.4개 상태테이블80행 ACTIVE, 기존 math_private.release_catalog(uuid)/evaluation_admission()의 허용목록만320→340leaf. 새RPC·엔진·Credit·계정권한 변경 없음.

기존 승인 PDF7파일·21문항 메타데이터를 그대로 사용한다. 운영 파일 재다운로드 SHA/35쪽/시작쪽 확인, 전지면 렌더 확인.2022모의Q2의 이어지는 표,2024모의Q3의 그래프·도형과 추가지문,2025수시Q2의 공식 정정문,2026수시Q1의 입체도형을 보존한다.2025/26수시 원문에는 서면허락 없는 출판·게재·사용 제한이 있다. 기존 studentDisplay/storageRead APPROVED 및 기존 운영 읽기정책과 Owner의 재사용 지시를 이어받은 것으로, 새 이용허락을 취득했다고 보고하지 않는다. 파일·메타데이터·Storage정책 추가/수정0. 별도 성균관 RIGHTS_HOLD는 유지한다.

[PDF SHA 및 페이지수](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/existing-pdf-download-verification.json), [문항별 PDF 연결](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/student-pdf-mappings.json).

## 2026학년도 모의 연도 및 Q1 HOLD

공식 게시글 [2025년(2026학년도 대비) 온라인 모의논술 문제 및 해설](https://ipsi.dongguk.edu/admission/html/counsel/dataView.asp?BOARD_IDX=34784),2025-07-04. **2025년 시행/2026학년도**가 맞다. 공식 문제 PDF SHA가 기존파일과 일치하므로 Registry연도·시험ID는 변경하지 않는다.

공식 게시글의 최신 첨부 `자연계 모의논술문제 해설(문항카드)_문항1해설수정.hwp`를 확인했다. 구자료Q1은 `x²/4+y²=1`,최종넓이 `3√3/2`; 공식 수정본은 `x²+4y²=1`,`3√3/8`이다. 이는 공식 자료 대조이며 AI 첨삭 품질 평가가 아니다.

**Q1 `49ea9aaa-1c46-51e7-b148-a03aef20ae4e`는 신규적재·Worker·공개허용목록에서 제외**한다. 기존 문제PDF/Registry메타데이터는 보존하여 기존 문제열람과 첨삭공개를 구분한다. Q2/Q3는 기존 부분공개 계약으로 연결한다. 해설내용을 임의수정하지 않았다. HWP LibreOffice변환은 파싱실패라 폐기했고 구조화본문/수식레코드를 대조했다. Q1해결조건: 공식 수정본을 정상 렌더 검증하여 해당문항의 근거·기준만 교체하고 기존 계약을 재검증한 뒤 공개. [HOLD 근거/원본링크/SHA](/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022/supabase/candidates/dongguk_public_20261112/hold.json).

## 사전 검증 및 적용계획

- 운영 SELECT137검사 PASS,보존지문20그룹 확보. 기존7시험21문항은 전체동국16시험 목록에 이미 존재하므로 browse RPC 변경0.
- 격리 PG17:20문항 제출/멱등성/MockWorker결과/타계정차단/재작성/재첨삭과 비파괴롤백 PASS,연결60검사 PASS. Provider0.
- WEB410 PASS/1 SKIP,APP39 PASS. 타입·정적빌드·Functions빌드 PASS. 기존숙명 테스트5실패는 이전HEAD에서도 동일재현 후2025모의 인문계열을 명시하는 테스트전제만 보완했다. 제품UI·첨삭엔진 변경0.
- 기존DB/권한 확인→273행 원자적적재→80상태·기존2함수 허용목록20추가/검증→논술범위 보존배포→일반계정권한/API 공개확인. WEB3plaintext범위만7시험/20leaf확장; 기존정적자산/API소스/Secrets/Preview/라우팅 보존.
- 장애시 신규WEB범위 닫기→`rollback-admission.sql`로 신규20leaf 진입차단. 데이터·사용자답안·평가·PDF를 삭제하지 않는다. 함수드리프트시 원복가드 중단. 격리롤백 PASS,운영실행0.

## 데이터 보존 검토

기존 Registry·사용자 이력을 유지하고 신규 내용만 분리 적재한다. 과거 결과/재첨삭 lineage를 덮어쓰지 않는다. 기존 사실·평가·공식 근거와 미래 모델 판단을 합치지 않는다. 새 개인정보 수집0,접근권한 확대0,보존기간 변경0. 기존 원본SHA·문항/시험ID·평가버전을 추적한다. 기존 분석/결제/Credit 의미와 삭제정책을 변경하지 않는다. 이전 대학 데이터와HOLD는 별도보존한다.

실제 AI 품질 검수는 전체 대학 작업후Owner가 수행한다. 로그인브라우저·실기기 미실행 항목은 NOT TESTED로 남긴다. 전체10대학 완료를 의미하지 않는다.
