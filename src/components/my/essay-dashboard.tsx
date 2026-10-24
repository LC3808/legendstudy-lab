'use client';
import {GrowthShare} from './growth-share';
import {MathSessionProgress} from '../math-release/session-progress';
import {EssaySessionProgress} from './essay-session-progress';
import {ExamRewrite} from './exam-rewrite';
import {readExamReports,examQuestionLabel,examAnswerCoverage} from '@/lib/my/exam-history';
import Link from 'next/link';
import {useCallback,useState} from 'react';
import {OwnerArea,useOwnerData,DataStatus,dateLabel} from './owner-data';
import {ReturnNavigation} from './return-navigation';
import {EvaluationReport,EvaluationComparison} from './evaluation-report';
import {humanReport,mathReport} from '@/lib/my/evaluation-report';
import {readEssayDashboard,readMathDashboard,readEssayDetail,mathRead,readMathSession,historyType,answerVersion,completedAt,type RecordItem} from '@/lib/my/essay-dashboard';
import type {SupabaseClient} from '@supabase/supabase-js';
import './essay-dashboard.css';
export function EssayDashboard(){
 return <div className="my-dashboard essay-personal content-wrap content-wrap--detail"><header className="my-head"><h1>나의 논술 LAB</h1><p>저장된 첨삭 결과로 강점과 보완할 점을 확인하세요.</p></header><OwnerArea path="/account/essay/"><PersonalContent /></OwnerArea></div>;
}
function PersonalContent(){
 const essay=useOwnerData(readEssayDashboard),math=useOwnerData(readMathDashboard);
 const [selected,setSelected]=useState<RecordItem|null>(null);
 const rows=[...(essay.data??[]),...(math.data??[])].sort((a,b)=>b.at.localeCompare(a.at));
 const ready=!!essay.data&&!!math.data;
 return <>
  <ReturnNavigation/>
  <div className="my-actions report-controls"><button className="button button--outline" onClick={()=>window.print()}>인쇄 / PDF 저장</button><GrowthShare rows={rows} selected={selected}/></div>
  <section className="my-section report-controls"><h2>확인할 답안 선택</h2><Link href="/my/essays/">나의 첨삭 기록 →</Link>
   {!essay.data&&<div><h3>논술 기록</h3><DataStatus error={essay.error} reload={essay.reload}/></div>}
   {!math.data&&<div><h3>수리논술 기록</h3><DataStatus error={math.error} reload={math.reload}/></div>}
   {ready&&!rows.length&&<div className="my-panel"><p>아직 첨삭 기록이 없습니다.</p><p>첫 답안을 작성하고 나의 논술 기록을 시작해보세요.</p><Link className="button button--primary" href="/essay-lab/">논술 LAB 시작하기 →</Link></div>}
   {rows.length>0&&<label>대학 · 답안 · 제출일<select aria-label="확인할 답안" value={selected?`${selected.source}:${selected.id}`:''} onChange={e=>setSelected(rows.find(r=>`${r.source}:${r.id}`===e.target.value)??null)}><option value="">답안을 선택해 주세요</option>{rows.map(row=><option key={`${row.source}:${row.id}`} value={`${row.source}:${row.id}`}>{row.university??'대학 정보 미제공'} · {row.question} · {dateLabel(row.at)} · {row.rewrite?'재작성':'최초'}</option>)}</select></label>}

  </section>
  <section className="my-section" aria-live="polite"><h2>평가 결과·재작성 비교</h2>{selected?<RecordDetail key={`${selected.source}:${selected.id}`} row={selected}/>:<p>기록을 선택하면 저장된 답안과 평가를 확인할 수 있습니다.</p>}</section>

 </>;
}
export function RecordDetail({row}:{row:RecordItem}){
 return row.source==='exam'?<ExamDetail row={row}/>:row.source==='essay'?<HumanDetail row={row}/>:row.mathSession?<MathRoundDetail row={row}/>:<MathDetail row={row}/>;
}
function HumanDetail({row}:{row:RecordItem}){
 const load=useCallback((c:SupabaseClient,o:string)=>readEssayDetail(c,o,row),[row]);const result=useOwnerData(load);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 const reports=result.data.attempts.flatMap(a=>result.data!.evaluations.filter(e=>e.attempt_id===a.id).map(e=>({attempt:a,report:humanReport(e,a.body,row.question,a)})));
 const revised=reports.find(r=>r.attempt.id===row.id&&r.attempt.attempt_no>1)?.report;
 const initial=reports.find(r=>r.report.id===revised?.priorId)?.report;
 return <>{result.data.attempts.filter(a=>!reports.some(r=>r.attempt.id===a.id)).map(a=><article className="my-panel" key={a.id}><h3>{a.attempt_no===1?"최초 답안":"재작성 답안"}</h3><p className="essay-answer">{a.body}</p><p>완료된 평가가 없습니다.</p></article>)}{reports.map(({report,attempt})=><EvaluationReport voiceType="humanities_social" key={report.id} title={attempt.attempt_no===1?'최초 평가':'재첨삭 평가'} report={report}/>)}<EvaluationComparison before={initial} after={revised}/></>;

}
function MathRoundDetail({row}:{row:RecordItem}){
 const load=useCallback((c:SupabaseClient,o:string)=>readMathSession(c,o,row.id),[row.id]);
 const result=useOwnerData(load);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 const run=result.data;
 return <><header className="essay-result-identity"><h2>{row.university??'수리논술'}</h2><p>{row.question} · {run.state==='completed'?'첨삭 완료':run.state==='cancelled'?'취소된 회차':'첨삭 진행 중'}</p><MathSessionProgress run={run} onChange={result.reload}/></header>{run.questions.map(q=><section key={q.attempt_id}><h3>{examQuestionLabel(q.question_id)}</h3><MathDetail row={{...row,id:q.attempt_id,mathSession:undefined,evaluations:[{id:q.evaluation_id,status:q.state,at:run.created_at,completedAt:run.state==='completed'?run.completed_at:null,valid:true}]}}/></section>)}</>;
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
 const reports=result.data.evaluations.map(e=>({prior:e.prior,report:mathReport(e.result)}));
 const before=reports.find(r=>r.prior)?.report,after=reports.find(r=>!r.prior)?.report;
 return <>{!reports.some(r=>!r.prior)&&<article className="my-panel"><h3>{row.rewrite?"재작성 답안":"최초 답안"}</h3><p className="essay-answer">{result.data.input.attempt?.typed_answer||"첨부 답안 · 비공개 보관"}</p><p>완료된 평가가 없습니다.</p></article>}{reports.map(({report,prior})=><EvaluationReport key={report.id} title={prior?'최초 평가':row.rewrite?'재첨삭 평가':'최초 평가'} report={report}/>)}<EvaluationComparison before={before} after={after}/></>;
}

function ExamDetail({row}:{row:RecordItem}){
 const [writing,setWriting]=useState<'free'|'paid'|null>(null);
 const load=useCallback((c:SupabaseClient,o:string)=>readExamReports(c,o,row.id),[row.id]);const data=useOwnerData(load);
 if(!data.data)return <DataStatus error={data.error} reload={data.reload}/>;
 if(!data.data.current.length)return <EssaySessionProgress key={row.id} runId={row.id} onComplete={data.reload}/>;
 if(writing)return <><button onClick={()=>setWriting(null)}>결과로 돌아가기</button><ExamRewrite runId={row.id} additional={writing==='paid'}/></>;
 return <><button className="button button--outline" onClick={()=>setWriting('free')}>다시 써보기</button>{data.data.run.continuous_cycles_supported===true&&<button className="button button--outline" onClick={()=>setWriting('paid')}>추가 첨삭 · 1 크레딧</button>}<header className="essay-result-identity"><h2>{row.university}</h2><p>{row.question}</p><span className={`essay-history-badge ${row.parentId?'included':''}`}>{historyType(row)}</span> <small>{dateLabel(completedAt(row))}</small></header><ul className="exam-answer-coverage">{examAnswerCoverage(row.examId,row.questionIds).map(q=><li key={q.id}>{q.label} · {q.written?'제출 답안':'미작성'}</li>)}</ul>{data.data.current.map(report=><div key={report.id}><span className="essay-history-badge">{examQuestionLabel(report.id.split('/').at(-1)??'')}</span><EvaluationReport voiceType="humanities_social" title={historyType(row)} answerLabel={answerVersion(row)} before={data.data!.previous.find(p=>p.id===report.priorId)} report={report}/><EvaluationComparison before={data.data!.previous.find(p=>p.id===report.priorId)} after={row.rewrite?report:undefined}/></div>)}</>;
}