'use client';
import {useEffect} from 'react';
import {readExamRuns,examReports,examQuestionLabel} from '@/lib/my/exam-history';
import {compareReports} from '@/lib/my/evaluation-report';
import type {SupabaseClient} from '@supabase/supabase-js';
import {useOwnerData,DataStatus} from './owner-data';

/** Each series is an actual parent/rewrite pair with matching immutable rubric pins. */
export async function readEssayGrowth(client:SupabaseClient,owner:string){
 const runs=await readExamRuns(client,owner);
 const completed=runs.filter(r=>r.state==='completed').sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
 const latest=new Map<string,typeof completed[number]>();
 for(const r of completed)if(typeof r.parent_id==='string')latest.set(r.parent_id,r);
 return [...latest.entries()].flatMap(([parentId,run])=>{
  const parent=completed.find(r=>r.id===parentId);if(!parent)return [];
  const before=examReports(parent);
  return examReports(run).flatMap(after=>{
   const initial=before.find(r=>r.id===after.priorId);if(!initial)return [];
   const changes=compareReports(initial,after);if(!changes)return [];
   return [{id:after.id,title:[String(run.university??''),String(run.title??''),examQuestionLabel(after.id.split('/').at(-1)??'')].filter(Boolean).join(' · '),changes}];
  });
 });
}
export function EssayGrowth(){
 const result=useOwnerData(readEssayGrowth,true);
 const reload=result.reload,owner=result.owner;
 useEffect(()=>{const refresh=()=>reload();const changed=(event:Event)=>{if((event as CustomEvent).detail?.owner===owner)reload();};window.addEventListener('focus',refresh);window.addEventListener('essay-history-changed',changed);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('essay-history-changed',changed);};},[reload,owner]);
 return <section className="my-panel"><h3>평가요소별 성장 변화</h3>{!result.data?<DataStatus error={result.error} reload={result.reload}/>:result.data.length===0?<p>같은 평가 기준의 최초 첨삭과 재첨삭이 모이면 성장 변화를 보여드려요.</p>:<><p className="my-note">저장된 최초 첨삭과 해당 답안의 최근 재첨삭을 비교합니다. 서로 다른 대학·문항의 단계는 합산하지 않습니다.</p>{result.data.map(series=><div className="growth-chart" key={series.id}><h4>{series.title}</h4>{series.changes.map(c=><div className="growth-chart__row" key={c.id}><strong>{c.name}</strong>{c.before.stars!==null&&c.after.stars!==null?<><label>최초 <meter min={0} max={5} value={c.before.stars}/><span>{c.before.stars}/5</span></label><label>최근 <meter min={0} max={5} value={c.after.stars}/><span>{c.after.stars}/5</span></label></>:<p>비교할 평가 단계가 저장되어 있지 않습니다.</p>}</div>)}</div>)}</>}</section>;
}
