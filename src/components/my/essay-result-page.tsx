 'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useCallback} from 'react';
import {useOwnerData,DataStatus} from './owner-data';
import {RecordDetail} from './essay-dashboard';
import {readEssayDashboard,readMathDashboard} from '@/lib/my/essay-dashboard';
import {EssayHistory} from './essay-history';
import type {SupabaseClient} from '@supabase/supabase-js';
import './essay-dashboard.css';
export function EssayResultPage(){
 const params=useSearchParams();
 return <EssayHistory initialSource={params.get('source')??''} initialId={params.get('id')??''}/>;
}
export function ResultContent({source,id}:{source:string;id:string}){
 const load=useCallback(async(c:SupabaseClient,o:string)=>{
  if(!id||!['exam','essay','math'].includes(source))return {row:null};
  const rows=await (source==='math'?readMathDashboard(c,o):readEssayDashboard(c,o));
  return {row:rows.find(r=>r.source===source&&r.id===id)??null};
 },[source,id]);
 const result=useOwnerData(load);
 return <>{!(source==='exam'&&result.data?.row?.evaluations?.some(e=>e.status==='completed'))&&<nav className="my-actions" aria-label="결과 화면 이동"><Link className="button button--outline" href="/my/essays/">나의 첨삭 기록</Link><Link className="button button--outline" href="/essay-lab/">다른 논술 풀기</Link></nav>}{result.data===undefined?<DataStatus error={result.error} reload={result.reload}/>:result.data.row?<RecordDetail key={`${source}:${id}`} row={result.data.row}/>:<section className="my-panel"><p>이 계정에서 해당 첨삭 기록을 찾을 수 없습니다.</p><button onClick={result.reload}>기록 다시 확인</button></section>}</>;
}
