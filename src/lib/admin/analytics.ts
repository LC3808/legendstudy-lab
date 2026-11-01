import { AdminError } from './errors';
import { periodBounds, type AdminPeriod } from './period';

export const reports = {
 satisfaction: ['admin_essay_satisfaction','essay-satisfaction-v2'],
 kpi: ['analytics_kpi_overview', 'analytics-kpi-v1'],
 funnel: ['analytics_funnel', 'analytics-funnel-v1'],
 revenue: ['analytics_revenue', 'analytics-revenue-v1'],
 cost: ['analytics_api_cost', 'analytics-api-cost-v1'],
 university: ['analytics_university_usage', 'analytics-university-usage-v1'],
} as const;
export type ReportKind = keyof typeof reports;
export type Metric = {label:string; value:number|null; unit?:string};
export type AnalyticsReport = {metrics:Metric[]; note:string; rows?:{label:string;values:(number|null)[]}[];columns?:string[]};
function object(value:unknown):Record<string,unknown> {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AdminError('MALFORMED_RESPONSE','Invalid report');
 return value as Record<string,unknown>;
}
function number(value:unknown, nullable=false):number|null {
 if (nullable && value===null) return null;
 if (typeof value!=='number'||!Number.isFinite(value)) throw new AdminError('MALFORMED_RESPONSE','Invalid metric');
 return value;
}
export function analyticsWindow(period:AdminPeriod,from='',to='',now=new Date()) {
 const bounds=periodBounds(period,from,to,now);
 if(!bounds || !Number.isFinite(bounds.from) || bounds.to-bounds.from>400*86400000) return null;
 return {p_from:new Date(bounds.from).toISOString(),p_to:new Date(bounds.to).toISOString()};
}
export function parseAnalytics(kind:ReportKind,raw:unknown):AnalyticsReport {
 const data=object(raw);
 if(data.version!==reports[kind][1]) throw new AdminError('MALFORMED_RESPONSE','Unknown report version');
 const metric=(key:string,label:string,nullable=false,unit=''):Metric=>({label,value:number(data[key],nullable),unit});
 if(kind==='satisfaction') {
  if(data.basis!=='submitted_feedback')throw new AdminError('MALFORMED_RESPONSE','Unknown satisfaction basis');
  const stats=object(data.stats);
  if(!Array.isArray(data.distribution)||data.distribution.length!==5)throw new AdminError('MALFORMED_RESPONSE','Invalid ratings');
  const avg=number(stats.average,true);
  if(avg!==null&&(avg<1||avg>5))throw new AdminError('MALFORMED_RESPONSE','Invalid average');
  const seen=new Set<number>();
  return {note:'제출된 1~5점 만족도만 평균에 포함합니다. 기존 도움이 되었어요/아쉬워요 응답을 숫자로 변환하지 않습니다. 응답자 표본이며 모든 사용자 만족도를 의미하지 않습니다.',metrics:[{label:'평균 만족도',value:avg,unit:'/ 5'},{label:'점수 응답',value:number(stats.rated)},{label:'기존 이진 응답',value:number(stats.legacy_binary)},{label:'오류 신고',value:number(stats.reports)},{label:'해결 완료 신고',value:number(stats.resolved_reports)}],columns:['만족도','응답 수'],rows:data.distribution.map(value=>{const row=object(value);const rating=number(row.rating);if(rating===null||!Number.isInteger(rating)||rating<1||rating>5||seen.has(rating))throw new AdminError('MALFORMED_RESPONSE','Invalid rating');seen.add(rating);return {label:rating+'점',values:[number(row.count)]};})};
 }
 if(kind==='kpi') {
  const active=object(data.active_learners);
  if(active.basis!=='server_learning_activity') throw new AdminError('MALFORMED_RESPONSE','Unknown activity basis');
  return {note:'활성 학습자는 서버 학습 기록 기준이며 GA4 방문자 수가 아닙니다. 일·주·월 수치는 선택 기간의 종료일 기준입니다. 무료 평가 완료에는 무료 최초 첨삭과 재첨삭이 함께 포함됩니다.',metrics:[
   ...(['dau','wau','mau'] as const).map((key,i)=>({label:['일간 활성 학습자','주간 활성 학습자','월간 활성 학습자'][i],value:number(active[key])})),
   metric('new_signups','신규 가입자'),metric('completed_eval_users','첨삭 완료 사용자'),metric('free_eval_completed_users','무료 평가 완료 사용자'),metric('eval_success_rate','평가 성공률',true,'%')]};
 }
 if(kind==='cost') {
  if(data.currency!=='USD')throw new AdminError('MALFORMED_RESPONSE','Unexpected cost currency');
  if(!Array.isArray(data.daily))throw new AdminError('MALFORMED_RESPONSE','Missing cost series');
  return {note:'USD 기준 확인된 금액의 부분합입니다. ACTUAL은 보고 비용, ESTIMATED는 추정 비용이며 UNKNOWN 호출은 0원으로 계산하지 않습니다. 시각 미상 호출은 일별 추이에 포함되지 않습니다.',metrics:[metric('actual_calls','ACTUAL 호출'),metric('estimated_calls','ESTIMATED 호출'),metric('unknown_calls','UNKNOWN 호출'),metric('undated_calls','시각 미상 호출'),metric('total_reported_cost','ACTUAL 부분합',true,'USD'),metric('total_estimated_cost','ESTIMATED 부분합',true,'USD')],columns:['일자 (KST)','ACTUAL 비용 (USD)','호출 수'],rows:data.daily.map(value=>{const row=object(value);if(typeof row.day!=='string')throw new AdminError('MALFORMED_RESPONSE','Invalid day');return {label:row.day.slice(0,10),values:[number(row.reported_cost,true),number(row.calls)]};})};
 }
 if(kind==='university') {
  if(!Array.isArray(data.universities))throw new AdminError('MALFORMED_RESPONSE','Missing universities');
  return {note:'기존 문항 세션과 시험 단위 회차 집계를 함께 표시합니다. 사용자 수 또는 문항당 이용률로 해석하지 않습니다. 기존 RPC의 최대 60개 대학입니다.',metrics:[],columns:['대학','세션·회차','제출','완료'],rows:data.universities.map(value=>{const row=object(value);if(typeof row.name!=='string')throw new AdminError('MALFORMED_RESPONSE','Invalid university');return {label:row.name,values:[number(row.sessions),number(row.attempts),number(row.completed)]};})};
 }
 if(kind==='revenue') {
  if(data.currency!=='KRW'||data.mode!=='LIVE') throw new AdminError('MALFORMED_RESPONSE','Unexpected payment scope');
  return {note:'기존 payment_orders의 LIVE·KRW 거래만 집계합니다. APP IAP 통합 매출이 아닙니다. 환불은 취소 완료 시각 기준이며 Credit 예약 해제와 구분합니다.',metrics:[
   metric('buyers','유료 구매자'),metric('paid_orders','구매 건수'),metric('gross_revenue','총매출',false,'원'),metric('refunded','환불 금액',false,'원'),metric('net_revenue','순매출',false,'원'),metric('arppu','구매자당 평균 매출',true,'원'),metric('excluded_currency_orders','집계 제외 통화 거래'),metric('credit_released_units','Credit 예약 해제'),metric('credit_refunded_units','Credit 환불')]};
 }
 const stages=data.stages;
 const names:Record<string,string>={signup:'가입',first_submit:'최초 제출',first_eval_completed:'최초 평가 완료',rewrite_submit:'재작성 제출',full_loop_nsm:'전체 학습 루프 완료'};
 if(!Array.isArray(stages)||stages.length!==5) throw new AdminError('MALFORMED_RESPONSE','Invalid funnel');
 const seen=new Set<string>();
 const metrics=stages.map(value=>{const row=object(value);const key=String(row.key);if(!names[key]||seen.has(key))throw new AdminError('MALFORMED_RESPONSE','Invalid funnel stage');seen.add(key);return {label:names[key],value:number(row.count)};});
 return {metrics,note:'선택 기간에 가입한 사용자 코호트의 이후 전체 기간 행동입니다. 익명 방문→가입 연결 및 단계별 순차 전환율은 현재 계약에 없어 계산하지 않습니다.'};
}
