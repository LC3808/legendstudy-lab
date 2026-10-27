'use client';
import Link from 'next/link';
import {GrowthBars} from './growth-bars';
import {useEffect,useState} from 'react';
import {readExamRuns,examReports,examQuestionLabel} from '@/lib/my/exam-history';
import {growthHistory} from '@/lib/my/growth-history';
import type {SupabaseClient} from '@supabase/supabase-js';
import {useOwnerData,DataStatus} from './owner-data';

/** Read saved results only, in bounded batches; never trigger evaluation. */
export async function readEssayGrowth(client:SupabaseClient,owner:string){
 const runs=(await readExamRuns(client,owner)).filter(r=>r.state==='completed');
 const entries=[];
 for(let i=0;i<runs.length;i+=4){
  const batch=await Promise.all(runs.slice(i,i+4).map(async run=>{
   const rows=await readExamRuns(client,owner,String(run.id));
   if(rows.length!==1)throw Error('READ_FAILED');
   return {run,reports:examReports(rows[0]),title:(id:string,index:number)=>[String(run.university??''),String(run.title??'').replaceAll(String(run.university??''),'').replace(/\badmission\b/g,'수시논술').replace(/\bmock\b/g,'모의논술').trim(),examQuestionLabel(id.split('/').at(-1)??'')==='문항별 첨삭'?`제출 문항 ${index+1}`:examQuestionLabel(id.split('/').at(-1)??'')].filter(Boolean).join(' · ')};
  }));entries.push(...batch);
 }
 return growthHistory(entries);
}
export function EssayGrowth({compact=false}:{compact?:boolean}={}){
 const [now]=useState(()=>Date.now());
 const [period,setPeriod]=useState('all'),[selected,setSelected]=useState('');
 const result=useOwnerData(readEssayGrowth,true);
 const reload=result.reload,owner=result.owner;
 useEffect(()=>{const refresh=()=>reload();const changed=(event:Event)=>{if((event as CustomEvent).detail?.owner===owner)reload();};window.addEventListener('focus',refresh);window.addEventListener('essay-history-changed',changed);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('essay-history-changed',changed);};},[reload,owner]);
 const cutoff=period==='all'?0:now-Number(period)*86400000;
 const series=[...(result.data??[])].reverse().filter(s=>new Date(s.at).getTime()>=cutoff);
 const active=series.find(s=>s.id===selected)??series[0];
 return <section className={`my-panel learning-growth${compact?' learning-growth--compact':''}`}><header className="learning-section-head"><div>{compact?<h3>나의 논술 LAB</h3>:<><span className="learning-eyebrow">나의 논술 LAB</span><h2>나의 논술 성장</h2></>}</div>{!compact&&<label>조회 기간<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">전체 기간</option><option value="30">최근 30일</option><option value="90">최근 90일</option><option value="365">최근 1년</option></select></label>}</header>
 {!compact&&<p className="my-note">같은 시험·문항과 동일한 평가 기준의 저장 결과를 비교합니다. 최근 50회차 조회 범위이며, 다른 기준·점수 척도는 연결하지 않습니다.</p>}
 {!result.data?<DataStatus error={result.error} reload={result.reload}/>:!active?<div className="growth-empty"><h3>첨삭 후, 성장의 변화를 확인해 보세요</h3><p>이 기간에 조회된 완료 기록이 없습니다.</p></div>:<><label className="growth-select">비교할 시험 · 문항<select value={active.id} onChange={e=>setSelected(e.target.value)}>{series.map(s=><option value={s.id} key={s.id}>{s.title}</option>)}</select></label><GrowthBars history={active.points} compact={compact}/>
 {!compact&&<><div className="growth-feedback"><section><h3>최근 첨삭에서 잘한 점</h3>{active.strengths.length?<ul>{active.strengths.slice(0,3).map((f,i)=><li key={i}>{f.explanation||f.title}</li>)}</ul>:<p>저장된 강점 피드백이 없습니다.</p>}</section><section><h3>다음 답안에서 보완할 점</h3>{active.weaknesses.length?<ul>{active.weaknesses.slice(0,3).map((f,i)=><li key={i}>{f.explanation||f.title}</li>)}</ul>:<p>저장된 보완 피드백이 없습니다.</p>}</section></div><p className="my-note">선택한 문항의 저장된 피드백입니다. 전체 시험에 대한 종합 판단이 아닙니다.</p></>}</>}
 {compact&&<Link className="button button--outline button--small" href="/account/essay/">나의 논술 LAB에서 자세히 보기 →</Link>}
 </section>;
}
