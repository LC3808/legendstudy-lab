'use client';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '../auth-context';
import {SourceExamWriter} from '../source-exam-writer';
import {EssayExamSubmit,type SubmissionDraft} from '../essay-exam-submit';
import {readExamRuns} from '@/lib/my/exam-history';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
/** Reuse the source writer and submit gateway. No copied History or Provider path. */
export function ExamRewrite({runId,additional}:{runId:string;additional:boolean}){
 const auth=useAuth();const [state,setState]=useState<{exam:SourceExam;run:Record<string,unknown>}|null>(null),[error,setError]=useState(false),[active,setActive]=useState('');
 const [drafts,setDrafts]=useState<Record<string,SubmissionDraft>>({});
 const onDraft=useCallback((key:string,body:string,images:boolean)=>setDrafts(old=>({...old,[key]:{body,images,revision:old[key]?.body===body?old[key].revision:(old[key]?.revision??0)+1}})),[]);
 const onDirty=useCallback(()=>{},[]);
 useEffect(()=>{let live=true;void(async()=>{
  if(!auth.client||!auth.user)return;const owner=auth.user.id;
  const runs=await readExamRuns(auth.client,owner,runId);if(runs.length!==1)throw Error();
  const session=(await auth.client.auth.getSession()).data.session;if(!session||session.user.id!==owner)throw Error();
  const response=await fetch('/api/essay/catalog',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});if(!response.ok)throw Error();
  const data=await response.json();const exam=(data.exams as SourceExam[]).find(e=>e.dbExamId===runs[0].exam_id);if(!exam || !(runs[0].question_ids as string[]).every(id=>exam.questions.some(q=>q.dbQuestionId===id)))throw Error();
  if(live)setState({exam,run:runs[0]});
 })().catch(()=>{if(live)setError(true);});return()=>{live=false;};},[auth.client,auth.user,runId]);
 if(error)return <p>기존 시험과 답안을 불러오지 못했어요. 다시 열어 주세요.</p>;
 if(!state||!auth.user)return <p>시험과 작성 중인 답안을 확인하고 있어요.</p>;
 const {exam,run}=state;const questions=exam.questions.filter(q=>(run.question_ids as string[]).includes(q.dbQuestionId??''));
 const current=questions.find(q=>q.key===active)??questions[0];const root=String(run.parent_id??run.id);
 return <section><h3>다시 써보기</h3><div role="group" aria-label="작성할 문항">{questions.map(q=><button key={q.key} onClick={()=>setActive(q.key)}>{q.label}</button>)}</div>{questions.map(q=><div key={q.key} hidden={current?.key!==q.key}><SourceExamWriter exam={exam} question={q} owner={auth.user!.id} onDirty={onDirty} onDraft={onDraft} rewrite={{id:runId,additional,previousAnswer:String((run.answers as {questionId:string;body:string}[]).find(a=>a.questionId===q.dbQuestionId)?.body??'')}}/></div>)}<EssayExamSubmit exam={exam} included={questions.map(q=>q.key)} drafts={drafts} cycle={additional?{previousPaidRunId:root}:{parentId:root}}/></section>;
}
