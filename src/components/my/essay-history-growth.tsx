'use client';
import {GrowthBars} from './growth-bars';
import {useEffect,useState} from 'react';
import {readExamRuns,readExamReports,examQuestionLabel} from '@/lib/my/exam-history';
import {compareReports} from '@/lib/my/evaluation-report';
import type {SupabaseClient} from '@supabase/supabase-js';
import {useOwnerData,DataStatus} from './owner-data';

/** Each series is an actual parent/rewrite pair with matching immutable rubric pins. */
export async function readEssayGrowth(client:SupabaseClient,owner:string){
 const runs=await readExamRuns(client,owner);
 const completed=runs.filter(r=>r.state==='completed').sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
 const latest=new Map<string,typeof completed[number]>();
 for(const r of completed)if(typeof r.parent_id==='string')latest.set(r.parent_id,r);
 const series=[];
 for(const run of latest.values()){
  const detail=await readExamReports(client,owner,String(run.id));
  const before=detail.previous;
  series.push(...detail.current.flatMap((after,index)=>{
   const initial=before.find(r=>r.id===after.priorId);if(!initial)return [];
   const changes=compareReports(initial,after);if(!changes)return [];
   return [{id:after.id,at:String(run.created_at),strengths:after.strengths,weaknesses:after.weaknesses,title:[String(run.university??''),String(run.title??'').replaceAll(String(run.university??''),'').replace(/\badmission\b/g,'수시논술').replace(/\bmock\b/g,'모의논술').trim(),examQuestionLabel(after.id.split('/').at(-1)??'')==='문항별 첨삭'?`제출 문항 ${index+1}`:examQuestionLabel(after.id.split('/').at(-1)??'')].filter(Boolean).join(' · '),changes}];
  }));
 }
 return series;
}
export function EssayGrowth(){
 const [now]=useState(()=>Date.now());
 const [period,setPeriod]=useState('all'),[selected,setSelected]=useState('');
 const result=useOwnerData(readEssayGrowth,true);
 const reload=result.reload,owner=result.owner;
 useEffect(()=>{const refresh=()=>reload();const changed=(event:Event)=>{if((event as CustomEvent).detail?.owner===owner)reload();};window.addEventListener('focus',refresh);window.addEventListener('essay-history-changed',changed);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('essay-history-changed',changed);};},[reload,owner]);
 const cutoff=period==='all'?0:now-Number(period)*86400000;
 const series=[...(result.data??[])].reverse().filter(s=>new Date(s.at).getTime()>=cutoff);
 const active=series.find(s=>s.id===selected)??series[0];
 return <section className="my-panel learning-growth"><header className="learning-section-head"><div><span className="learning-eyebrow">나의 논술 LAB</span><h2>나의 논술 성장</h2></div><label>조회 기간<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">전체 기간</option><option value="30">최근 30일</option><option value="90">최근 90일</option><option value="365">최근 1년</option></select></label></header>
 <p className="my-note">같은 답안의 최초 첨삭과 최근 재첨삭을 비교합니다. 서로 다른 대학·문항의 단계는 합산하지 않습니다.</p>
 {!result.data?<DataStatus error={result.error} reload={result.reload}/>:!active?<div className="growth-empty"><h3>재작성 후, 성장의 변화를 확인해 보세요</h3><p>이 기간에는 같은 평가 기준으로 비교할 최초·재첨삭 기록이 없습니다. 최초 첨삭의 피드백은 첨삭 기록에서 확인할 수 있어요.</p></div>:<><label className="growth-select">비교할 시험 · 문항<select value={active.id} onChange={e=>setSelected(e.target.value)}>{series.map(s=><option value={s.id} key={s.id}>{s.title}</option>)}</select></label><GrowthBars changes={active.changes}/>
 <div className="growth-feedback"><section><h3>최근 재첨삭에서 잘한 점</h3>{active.strengths.length?<ul>{active.strengths.slice(0,3).map((f,i)=><li key={i}>{f.explanation||f.title}</li>)}</ul>:<p>저장된 강점 피드백이 없습니다.</p>}</section><section><h3>다음 답안에서 보완할 점</h3>{active.weaknesses.length?<ul>{active.weaknesses.slice(0,3).map((f,i)=><li key={i}>{f.explanation||f.title}</li>)}</ul>:<p>저장된 보완 피드백이 없습니다.</p>}</section></div><p className="my-note">선택한 문항의 저장된 피드백입니다. 전체 시험에 대한 종합 판단이 아닙니다.</p></>}
 </section>;
}
