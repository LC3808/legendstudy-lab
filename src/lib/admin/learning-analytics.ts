import {AdminError} from './errors';
export const learningMetrics = {targets:'희망 대학 등록 학생',saved:'기간 내 저장된 자료',recent:'최근 열람 학생·자료 쌍',applications:'기간 내 등록한 실제 지원',study_users:'학습 기록 학생',study_ms:'공부 시간'} as const;
export type LearningAnalytics={version:string;as_of:string;from:string;to:string;timezone:'Asia/Seoul';minimum_sample:number;state:'READY'|'EMPTY'|'SUPPRESSED';metrics:Record<keyof typeof learningMetrics,number|null>;rows:{kind:string;label:string;users:number;records:number}[]};
export function parseLearningAnalytics(raw:unknown):LearningAnalytics{
 const v=raw as LearningAnalytics;
 const count=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
 if(v?.version!=='admin-learning-analytics-v1'||v.timezone!=='Asia/Seoul'||![1,5].includes(v.minimum_sample)||!['READY','EMPTY','SUPPRESSED'].includes(v.state)||![v.as_of,v.from,v.to].every(s=>typeof s==='string'&&Number.isFinite(Date.parse(s)))||!v.metrics||Object.keys(learningMetrics).some(k=>v.metrics[k as keyof typeof learningMetrics]!==null&&!count(v.metrics[k as keyof typeof learningMetrics]))||!Array.isArray(v.rows)||v.rows.some(r=>!['targets','saved','recent','applications'].includes(r.kind)||typeof r.label!=='string'||!count(r.records)||!count(r.users)||r.users<1||r.records<r.users))throw new AdminError('MALFORMED_RESPONSE');
 return v;
}
export const learningDefinitions={targets:'선택 기간에 등록되어 현재 남아 있는 희망 대학. 실제 지원/과거 변경 이력이 아닙니다.',saved:'선택 기간에 저장하여 현재 남아 있는 자료. 삭제된 저장 이력은 복원하지 않습니다. 시험 외 자료 포함.',recent:'최근 열람 시각이 기간 내인 학생·자료 쌍. 페이지뷰/총 열람 횟수가 아닙니다.',applications:'기간 내 생성되어 남아 있는 자기보고 지원 기록. 합격·등록 실적으로 환산하지 않습니다.',study:'동기화 완료·학습 합산 대상 구간만 집계합니다. 동일 학생의 겹치는 시간을 합치고 선택 기간 경계에서 자릅니다. 미기록은 공부하지 않았다는 뜻이 아닙니다.'};
