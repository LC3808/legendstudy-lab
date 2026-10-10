import { object, text, mathReport, compareReports } from '@/lib/my/evaluation-report';
import type { StoredMathCase, StoredMathDetail } from './runtime/quality-client';
export type TraceRecord = StoredMathCase & { detail: StoredMathDetail };
/** Only explicit prior-evaluation edges connect attempts. Missing identities never
 * become a shared user; missing parents/cycles remain separately inspectable. */
export function traceGroups(records: TraceRecord[]) {
 const byId = new Map(records.map(r => [r.evaluation_id, r]));
 const groups = new Map<string, {key:string; label:string; rubric:string; processes:Map<string,{id:string; reason:string; records:TraceRecord[]}>}>();
 for (const r of records) {
  const d=r.detail,p=object(d.problem),profile=object(d.profile);
  const problem=text(p.id), rubric=text(profile.rubric_version);
  const key=JSON.stringify([problem||r.leaf_id||r.evaluation_id,text(d.profile_id)||r.evaluation_id,rubric]);
  let root=r,reason=''; const seen=new Set<string>();
  while(text(root.detail.prior_evaluation_id)) {
   seen.add(root.evaluation_id);
   const prior=byId.get(text(root.detail.prior_evaluation_id));
   if(!prior){reason='이전 평가가 조회 범위에 없습니다.';break;}
   if(seen.has(prior.evaluation_id)){reason='평가 연결에 순환이 있어 분리했습니다.';root=r;break;}
   if(prior.leaf_id!==r.leaf_id){reason='이전 평가의 문항이 달라 분리했습니다.';root=r;break;}
   root=prior;
  }
  if(!groups.has(key))groups.set(key,{key,label:`문제 정보 미연결 · ${problem||r.leaf_id||r.evaluation_id}`,rubric:rubric||'평가 기준 버전 미확인',processes:new Map()});
  const g=groups.get(key)!;
  if(!g.processes.has(root.evaluation_id))g.processes.set(root.evaluation_id,{id:root.evaluation_id,reason,records:[]});
  g.processes.get(root.evaluation_id)!.records.push(r);
 }
 return [...groups.values()].map(g=>({...g,processes:[...g.processes.values()].map(p=>({...p,records:p.records.sort((a,b)=>a.completed_at.localeCompare(b.completed_at))}))}));
}
export function answerChanges(before:string,after:string){
 const a=before.split('\n'),b=after.split('\n');
 // Literal changes only, never infer that the student followed an AI suggestion.
 return {removed:a.filter(x=>x.trim()&&!b.includes(x)),added:b.filter(x=>x.trim()&&!a.includes(x))};
}
export function traceComparison(before:StoredMathDetail,after:StoredMathDetail){
 if(text(after.prior_evaluation_id)!==before.evaluation_id)return null;
 return compareReports(mathReport(before),mathReport(after));
}
