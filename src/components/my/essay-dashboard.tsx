'use client';
import {logAnalytics} from '@/lib/analytics/client';
import {analyticsEvents as AE} from '@/lib/analytics/events';
import {ExamResultLayout} from './exam-result-layout';
import {EssayGrowth} from './essay-history-growth';
import {essayResultHref} from '@/lib/my/essay-result-route';
import {summarizeRecords,historyType} from '@/lib/my/essay-dashboard';
import {GrowthShare} from './growth-share';
import {MathSessionProgress} from '../math-release/session-progress';
import {EssaySessionProgress} from './essay-session-progress';
import {ExamRewrite} from './exam-rewrite';
import {readExamReports,examQuestionLabel} from '@/lib/my/exam-history';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {OwnerArea,useOwnerData,DataStatus,dateLabel} from './owner-data';
import {EvaluationReport,EvaluationComparison} from './evaluation-report';
import {humanReport,mathReport} from '@/lib/my/evaluation-report';
import {readEssayDashboard,readMathDashboard,readEssayDetail,mathRead,readMathSession,type RecordItem} from '@/lib/my/essay-dashboard';
import type {SupabaseClient} from '@supabase/supabase-js';
import './essay-dashboard.css';
export function EssayDashboard(){
 return <div className="my-dashboard essay-personal content-wrap content-wrap--detail"><header className="my-head"><h1>나의 논술 LAB</h1><p>저장된 첨삭 결과로 강점과 보완할 점을 확인하세요.</p></header><OwnerArea path="/account/essay/"><PersonalContent /></OwnerArea></div>;
}
function PersonalContent(){
 const essay=useOwnerData(readEssayDashboard),math=useOwnerData(readMathDashboard);
 const rows=[...(essay.data??[]),...(math.data??[])].sort((a,b)=>b.at.localeCompare(a.at));
 const ready=!!essay.data&&!!math.data,summary=summarizeRecords(rows);
 return <>
 <nav className="my-actions report-controls"><Link className="button button--primary" href="/my/essays/">나의 첨삭 기록 확인 →</Link><Link className="button button--outline" href="/essay-lab/">새 논술 풀기</Link><button className="button button--outline" onClick={()=>window.print()}>인쇄 / PDF 저장</button><GrowthShare rows={rows} selected={null}/></nav>
 <EssayGrowth/>
 <section className="my-panel learning-next"><h2>피드백을 다음 답안에 적용해 보세요</h2><p>완료한 첨삭 기록에서 재작성하면 같은 문항의 최초 답안과 개선된 답안을 비교할 수 있어요.</p><Link href="/my/essays/" className="button button--primary">결과와 재작성 안내 확인 →</Link></section>
 <section className="my-section"><h2>학습 현황</h2><div className="learning-stats">{[['첨삭한 시험',summary.evaluatedExams],['첨삭 회차',summary.evaluatedCycles],['재작성한 답안',summary.rewritten],['재첨삭 완료',summary.reevaluated]].map(([label,n])=><div key={label}><span>{label}</span><strong>{ready?n:'—'}</strong></div>)}</div><p className="my-note">조회된 시험 기록과 최근 논술 연습·수리 답안 기준입니다. 시험 정보가 없는 과거 답안은 시험·회차 수에서 제외합니다.</p></section>
 {!essay.data&&<DataStatus error={essay.error} reload={essay.reload}/>}{!math.data&&<DataStatus error={math.error} reload={math.reload}/>}
 {ready&&!rows.length&&<section className="my-panel"><p>아직 첨삭 기록이 없습니다.</p><Link className="button button--primary" href="/essay-lab/">논술 LAB 시작하기 →</Link></section>}
 <section className="my-section"><h2>최근 첨삭 기록</h2><div className="dashboard-recent">{rows.slice(0,5).map(row=><Link className="my-panel" key={`${row.source}:${row.id}`} href={essayResultHref(row.source,row.id)}><strong>{row.university??'대학 정보 미제공'}</strong><span>{row.question}</span><small>{dateLabel(row.at)} · {historyType(row)}</small><b>결과 보기 →</b></Link>)}</div></section>
 </>;
}

export function RecordDetail({row}:{row:RecordItem}){
 useEffect(()=>{logAnalytics(AE.essayResultView,{source:row.source},row.source+':'+row.id);},[row.source,row.id]);
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
 useEffect(()=>{const run=data.data?.run;if(run?.state==='completed'&&run.parent_id)logAnalytics(AE.essayRewriteCompleted,{status:'completed',source:'client_observation'},row.id);},[data.data,row.id]);
 if(!data.data)return <DataStatus error={data.error} reload={data.reload}/>;
 if(!data.data.current.length)return <EssaySessionProgress key={row.id} runId={row.id} onComplete={data.reload}/>;
 if(writing)return <><button onClick={()=>setWriting(null)}>결과로 돌아가기</button><ExamRewrite runId={row.id} additional={writing==='paid'}/></>;
 return <ExamResultLayout row={row} run={data.data.run} reports={data.data.current} previous={data.data.previous} onRewrite={()=>setWriting('free')} onAdditional={()=>setWriting('paid')}/>;
}
