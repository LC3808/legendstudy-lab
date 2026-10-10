import { object, text, mathReport, compareReports } from '@/lib/my/evaluation-report';
import { qualityMetadata, sameTraceEdge } from './metadata';
import type { StoredMathCase, StoredMathDetail } from './runtime/quality-client';
export type TraceRecord = StoredMathCase & { detail: StoredMathDetail };
/** Only explicit prior-evaluation edges connect attempts. Missing identities never
 * become a shared user; missing parents/cycles remain separately inspectable. */
export function traceGroups(records: TraceRecord[]) {
 const byId = new Map(records.map(r => [r.evaluation_id, r]));
 const groups = new Map<string, {key:string; label:string; rubric:string; processes:Map<string,{id:string; reason:string; subject:string|null; records:TraceRecord[]}>}>();
 for (const r of records) {
  const d=r.detail,p=object(d.problem),profile=object(d.profile);
  const m=qualityMetadata(d);
  const problem=m?.problem||text(p.id), rubric=text(profile.rubric_version);
  const key=JSON.stringify([problem||r.leaf_id||r.evaluation_id,text(d.profile_id)||r.evaluation_id,rubric]);
  let root=r,reason=''; const seen=new Set<string>();
  while(text(root.detail.prior_evaluation_id)) {
   seen.add(root.evaluation_id);
   const prior=byId.get(text(root.detail.prior_evaluation_id));
   if(!prior){reason='이전 평가가 조회 범위에 없습니다.';break;}
   if(seen.has(prior.evaluation_id)){reason='평가 연결에 순환이 있어 분리했습니다.';root=r;break;}
   if(!sameTraceEdge(prior.detail,root.detail)){reason='이전 평가의 사용자·문항·평가 기준·답안 과정이 일치하지 않아 분리했습니다.';root=r;break;}
   root=prior;
  }
  if(!groups.has(key))groups.set(key,{key,label:m?.label||`문제 정보 미연결 · ${problem||r.leaf_id||r.evaluation_id}`,rubric:rubric||'평가 기준 버전 미확인',processes:new Map()});
  const g=groups.get(key)!;
  const processId=m?.root&&!reason?JSON.stringify([m.subject,m.root]):root.evaluation_id;
  if(d.quality_metadata!==undefined&&(!m||!m.root)){reason='답안 과정 메타데이터를 확인할 수 없어 분리했습니다.';root=r;}
  const id=reason&&d.quality_metadata!==undefined?r.evaluation_id:processId;
  if(!g.processes.has(id))g.processes.set(id,{id:!reason&&m?.root?m.root:root.evaluation_id,reason,subject:m?.subject||null,records:[]});
  g.processes.get(id)!.records.push(r);
 }
 return [...groups.values()].map(g=>{
  const processes=[...g.processes.values()].map(p=>({...p,records:p.records.sort((a,b)=>a.completed_at.localeCompare(b.completed_at))}));
  const users=new Map<string,{id:string;reference:string|null;processes:typeof processes}>();
  for(const p of processes){const id=p.subject||'unknown:'+p.id;if(!users.has(id))users.set(id,{id,reference:p.subject,processes:[]});users.get(id)!.processes.push(p);}
  return {...g,processes,users:[...users.values()]};
 });
}
export function answerChanges(before:string,after:string){
 const a=before.split('\n'),b=after.split('\n');
 // Literal changes only, never infer that the student followed an AI suggestion.
 return {removed:a.filter(x=>x.trim()&&!b.includes(x)),added:b.filter(x=>x.trim()&&!a.includes(x))};
}
export function traceComparison(before:StoredMathDetail,after:StoredMathDetail){
 if(!sameTraceEdge(before,after))return null;
 return compareReports(mathReport(before),mathReport(after));
}
