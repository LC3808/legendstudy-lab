export type LabRun={id:string;user_id:string;email?:string|null;exam_id:string;university_id:string|null;university:string|null;title:string|null;year:number|null;state:string;parent_id:string|null;created_at:string;completed_at:string|null;free_revision:boolean|null;beta_credit:boolean;question_count:number;result_question_count:number;billing_reason:string|null;credits_required:number|null;billing_status:string|null};
export type LabList={version:'admin-lab-filtered-v1';latest?:{university:string|null;title:string|null}|null;exams?:{exam_id:string;title:string|null}[];total:number;offset:number;limit:number;summary:{requested:number;initial:number;completed:number;failed:number;pending:number;free_revisions:number;beta_credit:number;last_requested_at:string|null;last_consumed_at:string|null};universities:{university_id:string;university:string}[];items:LabRun[]};
export type LabDetail={version:'admin-lab-detail-v1';user_id:string;run:Record<string,unknown>;billing:{id:string;reason:string;credits_required:number;status:string;created_at:string;reserved_at:string|null;settled_at:string|null;released_at:string|null}|null;ledger:{id:string;at:string;type:string;balance_delta:number;reserved_delta:number;origin:string;reversal_of:string|null}[];calls:{call_id:string;called_at:string|null;provider:string|null;model:string|null;duration_seconds:number|null;call_state:string|null;cost_status:string;cost_usd:number|null}[];retries:{generation:number;at:string}[];diagnostics:{stage:string|null;code:string|null}[];children:{id:string;at:string;state:string}[];reviewed_questions:string[];result_viewed_at:null};
export const labState=(state:string)=>({completed:'완료',failed:'실패',reserved:'진행 중'}[state]??state);
export function labAlerts(d:LabDetail,now=Date.now()):string[]{
 const messages:string[]=[];const r=d.run;const qs=(r.result as {questions?:unknown[]}|null)?.questions??[];
 const consumed=d.ledger.filter(t=>t.type==='consume').reduce((n,t)=>n-t.balance_delta,0);
 if(r.state!=='completed'&&r.state!=='failed'&&now-Date.parse(String(r.created_at))>30*60000)messages.push('요청 후 30분 이상 미완료 — 확인 필요');
 if(r.state==='failed')messages.push('평가 실패');
 if(consumed>0&&!qs.length)messages.push('차감 기록 있으나 결과 없음 — 환불·해제 기록 확인');
 if(r.state==='completed'&&!qs.length)messages.push('완료 상태이나 저장 결과 없음');
 if(d.billing&&consumed>d.billing.credits_required)messages.push('예정 수량 초과 차감 의심 — 원장 확인');
 if(d.billing?.reason==='included_revision'&&consumed>0)messages.push('무료 재첨삭 추가 차감 의심');
 if(d.diagnostics.length)messages.push('실패 진단 기록 있음 — 현재 상태와 구분하여 확인');
 return messages;
}
