'use client';
import Link from 'next/link';
import {useCallback,useState} from 'react';
import {OwnerArea,useOwnerData,DataStatus,dateLabel} from './owner-data';
import {Usage} from './dashboard';
import {readEssayDashboard,readMathDashboard,readEssayDetail,mathRead,summarizeRecords,type RecordItem} from '@/lib/my/essay-dashboard';
import type {SupabaseClient} from '@supabase/supabase-js';
import './essay-dashboard.css';
export function EssayDashboard(){
 return <div className="my-dashboard essay-personal content-wrap content-wrap--detail"><header className="my-head"><h1>나의 논술 LAB</h1><p>내 논술 첨삭과 재작성 기록을 확인하세요.</p></header><OwnerArea path="/account/essay/"><PersonalContent /></OwnerArea></div>;
}
function PersonalContent(){
 const essay=useOwnerData(readEssayDashboard),math=useOwnerData(readMathDashboard);
 const [selected,setSelected]=useState<RecordItem|null>(null),[share,setShare]=useState(false);
 const rows=[...(essay.data??[]),...(math.data??[])].sort((a,b)=>b.at.localeCompare(a.at));
 const ready=!!essay.data&&!!math.data;const summary=summarizeRecords(rows);
 return <>
  <div className="my-actions report-controls"><button className="button button--outline" onClick={()=>window.print()}>인쇄 / PDF 저장</button><button className="button button--outline" onClick={()=>setShare(s=>!s)}>공유</button><Link className="button button--outline" href="/account/">마이페이지</Link></div>
  {share&&<div className="my-panel report-controls" role="status"><p>인쇄에서 ‘PDF로 저장’을 선택한 뒤, 저장한 파일을 직접 공유해 주세요. 답안과 개인정보가 포함될 수 있으니 공유 전에 내용을 확인해 주세요.</p><p>이 페이지 주소는 공개 공유 링크가 아닙니다.</p><button className="button button--outline" onClick={()=>window.print()}>PDF 저장하기</button></div>}
  <section className="my-section"><h2>내 논술 이용 현황</h2><p className="my-note">최근 논술 연습 50개와 수리 답안 50개 범위입니다. 전체 누적 통계가 아닙니다.</p><div className="my-metrics">
   {([['첨삭한 답안',summary.evaluated],['재작성한 답안',summary.rewritten],['재첨삭 완료',summary.reevaluated],['최근 첨삭일',summary.latest?dateLabel(summary.latest):'기록 없음']] as const).map(([label,value])=><article key={label} className="my-metric"><h3 className="my-metric__label">{label}</h3><p className="my-metric__value">{ready?value:'—'}</p></article>)}
  </div><p className="my-note">최근 첨삭일은 완료 시각이 제공되는 기록 기준입니다. 서로 다른 문제·평가 기준의 점수를 합산하지 않습니다.</p></section>
  <section className="my-section"><h2>첨삭·재작성 기록</h2>
   {!essay.data&&<div><h3>논술 기록</h3><DataStatus error={essay.error} reload={essay.reload}/></div>}
   {!math.data&&<div><h3>수리논술 기록</h3><DataStatus error={math.error} reload={math.reload}/></div>}
   {ready&&!rows.length&&<div className="my-panel"><p>아직 첨삭 기록이 없습니다.</p><p>첫 답안을 작성하고 나의 논술 기록을 시작해보세요.</p><Link className="button button--primary" href="/essay-lab/">논술 LAB 시작하기 →</Link></div>}
   <div className="my-essay-records">{rows.map(row=><article className="my-panel" key={`${row.source}:${row.id}`}><h3>{row.university??'대학 정보 미제공'} · {row.question}</h3><p>{row.source==='math'?'수리논술':'논술'} · {dateLabel(row.at)} 제출 · {row.rewrite?'재작성 답안':'최초 답안'}</p><ul>{row.evaluations.map(e=><li key={e.id}>{row.rewrite?'재첨삭':'첨삭'} · {statusLabel(e.status)}{!e.valid?' · 무효 처리된 평가':''}</li>)}</ul>{!row.evaluations.length&&<p>평가 기록 없음</p>}<button className="button button--outline report-controls" onClick={()=>setSelected(row)}>답안·평가 보기</button></article>)}</div>
  </section>
  <section className="my-section" aria-live="polite"><h2>평가 결과·재작성 비교</h2>{selected?<RecordDetail key={`${selected.source}:${selected.id}`} row={selected}/>:<p>기록을 선택하면 저장된 답안과 평가를 확인할 수 있습니다.</p>}</section>
  <section className="my-section"><h2>Credit 이용 현황</h2><Usage balanceLabel="남은 첨삭권"/></section>
 </>;
}
function statusLabel(status:string){return ({completed:'완료',pending:'대기',requested:'대기',queued:'대기',processing:'평가 중',failed:'실패',cancelled:'취소',reconciling:'처리 확인 중'} as Record<string,string>)[status.toLowerCase()]??'상태 확인 필요';}
function RecordDetail({row}:{row:RecordItem}){
 return row.source==='essay'?<HumanDetail row={row}/>:<MathDetail row={row}/>;
}
function HumanDetail({row}:{row:RecordItem}){
 const load=useCallback((c:SupabaseClient,o:string)=>readEssayDetail(c,o,row),[row]);const result=useOwnerData(load);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 return <>{result.data.attempts.map(a=><article className="my-panel essay-comparison" key={a.id}><h3>{a.attempt_no===1?'최초 답안':`재작성 답안 ${a.attempt_no-1}`}</h3><p className="essay-answer">{a.body}</p>{result.data!.evaluations.filter(e=>e.attempt_id===a.id).map(e=><div key={e.id}><h4>{a.attempt_no===1?'최초 평가':'재첨삭 평가'}</h4><p>{e.overall_summary??'종합 의견 없음'}</p><h4>강점</h4><ul>{e.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul><h4>보완점·개선 방향</h4><ul>{e.rewrite_checklist.map((s,i)=><li key={i}>{s}</li>)}</ul><h4>평가 항목</h4>{[...e.essay_evaluation_dimensions].sort((a,b)=>a.display_order-b.display_order).map((d,i)=><p key={i}>항목 {d.display_order} · {d.level_1_to_5??'미평가'}{d.level_1_to_5!==null?'/5':''} — {d.explanation}</p>)}</div>)}</article>)}</>;
}
function MathDetail({row}:{row:RecordItem}){
 const load=useCallback(async(c:SupabaseClient,o:string)=>{
  const input=await mathRead(c,o,'read_input',{attempt_id:row.id});
  const prior=input.attempt?.predecessor_id?await mathRead(c,o,'read_input',{attempt_id:input.attempt.predecessor_id}):null;
  const completed=row.evaluations.filter(e=>e.status.toLowerCase()==='completed');
  const ids=[...new Set([...completed.map(e=>e.id),...(input.attempt?.prior_evaluation_id?[input.attempt.prior_evaluation_id]:[])])];
  const evaluations=await Promise.all(ids.map(async id=>({id,prior:id===input.attempt?.prior_evaluation_id,result:await mathRead(c,o,'read_result',{evaluation_id:id})})));
  return {input,prior,evaluations};
 },[row]);const result=useOwnerData(load);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 return <>{result.data.prior&&<article className="my-panel"><h3>이전 답안</h3><p className="essay-answer">{result.data.prior.attempt?.typed_answer||'첨부 답안'}</p></article>}<article className="my-panel"><h3>{row.rewrite?'재작성 답안':'최초 답안'}</h3><p className="essay-answer">{result.data.input.attempt?.typed_answer||'첨부 답안'}</p>{result.data.input.artifacts?.length>0&&<p>첨부 답안 {result.data.input.artifacts.length}개 · 비공개 보관</p>}</article>{!result.data.evaluations.length&&<p>완료된 평가가 없습니다.</p>}{result.data.evaluations.map(e=><article className="my-panel" key={e.id}><h3>{e.prior?'이전 평가':row.rewrite?'재첨삭 평가':'최초 평가'}</h3><p>{typeof e.result.output?.overall?.explanation==='string'?e.result.output.overall.explanation:'평가 설명이 제공되지 않았습니다.'}</p>{Array.isArray(e.result.output?.steps)&&e.result.output.steps.map((s:{id:string;explanation:string})=><p key={s.id}>{s.explanation}</p>)}</article>)}</>;
}
