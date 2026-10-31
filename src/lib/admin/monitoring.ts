export type MetricRow = Record<string, unknown>;
export type OperationsReport = {
 total:number;summary:MetricRow;live:MetricRow;calendar_costs:MetricRow;cost_coverage:MetricRow;
 today_credit:MetricRow[];rows:MetricRow[];costs:MetricRow[];credit_groups:MetricRow[];free_rewrite_count:number;
 legacy_costs:MetricRow[];alerts:MetricRow[];thresholds:MetricRow[];
 detail:null|{run:MetricRow;retries:MetricRow[];diagnostics:MetricRow[];calls:MetricRow[];ledger:MetricRow[]};
};
export function monitoringValue(value:unknown,key=''):string {
 if(value===null||value===undefined)return 'UNKNOWN · 기록 없음';
 if(typeof value==='boolean')return value?'예':'아니요';
 if(typeof value==='number')return value.toLocaleString('ko-KR',{maximumFractionDigits:key.includes('usd')?6:2});
 if(typeof value==='string'&&/(?:_at)$/.test(key))return new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})+' KST';
 if(Array.isArray(value))return value.length?value.map(v=>typeof v==='object'&&v!==null?`${String(v.ordinal??'')} ${String(v.question_id??'')} · ${String(v.state??'')}`:String(v)).join('\n'):'없음';
 return typeof value==='object'?JSON.stringify(value):String(value);
}
export const monitoringLabels:Record<string,string>={evaluation_id:'평가 ID',created_at:'접수 시각',completed_at:'완료 시각',exam_id:'시험 ID',parent_id:'최초 회차 ID',evaluation_type:'평가 유형',university:'대학',exam_name:'시험',questions:'공식 제출 순서 · 문항 ID · 상태',state:'최종 상태',duration_seconds:'소요 시간(초)',retry_count:'재처리 횟수',failure_codes:'기록된 오류 코드',credit_sources:'Credit 출처',reserved:'총 예약 이력',reserved_current:'현재 예약 잔여',consumed:'차감',released:'예약 해제',refunded:'환불',recovery_pending:'복구 대기',duplicate_suspected:'중복 정산 의심',requests:'요청',completed:'성공',failed:'실패',processing:'예약 유지(진행/부분 실패 포함)',retry_pending:'부분 실패 · 재처리 확인 필요',success_rate:'확정 상태 중 성공률(%)',avg_seconds:'평균(초)',p50_seconds:'P50(초)',p90_seconds:'P90(초)',p95_seconds:'P95(초)',max_seconds:'최대(초)',retries:'재처리 요청',today_known_usd:'오늘 시각 확인 비용 소계(USD)',month_known_usd:'이번 달 시각 확인 비용 소계(USD)',undated_receipts:'호출 시각 미상 영수증',unknown_receipts:'비용 미상 영수증',receipts:'영수증 수',unknown:'비용 미상',time_unknown:'시각 미상',input_tokens:'입력 토큰',output_tokens:'출력 토큰',known_subtotal_per_receipted_run_usd:'영수증 있는 평가당 알려진 비용 소계(USD)',dimension:'분류',label:'구분',cost_status:'비용 근거',usd:'USD 소계',cost_usd:'USD 비용',calls:'호출 기록 수',model:'모델',provider:'Provider',call_id:'호출 식별자',called_at:'호출 시각',cached_tokens:'캐시 토큰',total_tokens:'총 토큰',price_id:'단가 버전',call_state:'호출 기록 상태',attempt:'문항 시도 번호',stage:'기록 단계',code:'오류 코드',message:'안전한 오류 안내',http_status:'HTTP 상태',occurred_at:'발생 시각',generation:'재처리 generation',requested_at:'재처리 접수',attempts:'문항별 시도',key:'checkpoint 키',at:'거래 시각',type:'거래 유형',balance_delta:'잔액 변화',reserved_delta:'예약 변화',origin:'원장 출처',rule:'경고 규칙',threshold:'임계값',unit:'단위',opened_at:'최초 감지',resolved_at:'해제 감지',value:'측정값'};
