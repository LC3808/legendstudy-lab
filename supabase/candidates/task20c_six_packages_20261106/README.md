# TASK20-C 우선 6문항 콘텐츠 후보

**운영 공개 확인 완료.** 기존 운영 Package에 이미 연결된 동일 6문항을 일반 사용자로 검수했다. 아래 SQL은 이전 TEST ID 기반 후보로 운영 재적용 금지. [운영 검수 기록](../../../docs/evidence/task20c-20261106/production-web.md)

**운영 적용 미승인·미실행.** 격리 TEST에 DRAFT 콘텐츠만 적용했다. [검수·대상 ID·테스트 보고](../../../docs/evidence/task20c-20261106/report.md)를 따른다.

전체 SQL/공식 원문은 Git에 넣지 않는다. `/Users/woojinchang/development/legendstudy-materials/task20c-20261106-private/compiled/draft.private.sql` 및 `rollback.private.sql`에 보관한다. 원본 Registry ID가 다르면 중단하며 같은 콘텐츠 재적용은 중복 생성하지 않는다. 다른 콘텐츠가 같은 ID에 있으면 중단한다.

원복은 해당 6 leaf에 평가 시도가 없는 경우에만 콘텐츠 삭제를 허용한다. 평가 참조 발생 시 삭제를 거부하며 운영 공개 범위만 원복해야 한다. 평가/History/이용권 삭제는 포함하지 않는다.

DRAFT 삽입은 운영 공개 승인과 다르다. 실제 Provider 검증 및 공개 RPC·admission 증분/사전 해시·ACL/원복 확정 후 정확한 운영 적용 범위를 별도로 승인받는다.

## 승인된 실제 TEST 검증 후속

[실제 평가6건·Q3 무료 재첨삭·원장 보고](../../../docs/evidence/task20c-20261106/live-test-report.md). scope-functions.candidate.sql은 기존 두 private 함수의 허용 leaf에 정확히6개만 추가한다. scope-rollback.sql은 적용 후 함수 해시/ACL이 일치할 때만 기존 범위를 복원한다. 공개 후보 구현의 disposable PG115 검사 PASS. private compiled/production-apply.private.sql에 콘텐츠/ACTIVE/함수 증분을 트랜잭션으로 준비했다.

경희Q3 학습 단계 누락은 미해결이며 이번 exact6 후보 전체 운영 적용을 요청하거나 승인받지 않았다. Q3 제외5개만 적용하려면 별도5개 후보와 검증이 필요하다. Gateway 공개 범위 설정은 Secret과 분리해 별도 사전값 보존/원복해야 한다.

최신 Q3 재검증: 승인된 TEST 1개 사용. 최초 등급 미제공·무료 재첨삭 5, 두 건 모두 정답·공식 기준 6개 충족. 조건부 후보이며 운영 미적용. 위 대상별 승인과 부분 적용 제한은 유지한다.
