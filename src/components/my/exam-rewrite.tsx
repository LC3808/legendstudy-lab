'use client';
import {logAnalytics} from '@/lib/analytics/client';
import {analyticsEvents as AE} from '@/lib/analytics/events';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '../auth-context';
import {SourceExamWriter} from '../source-exam-writer';
import {type SubmissionDraft} from '../essay-exam-submit';
import {ScopedExamSubmit} from '../scoped-exam-submit';
import {readExamRuns} from '@/lib/my/exam-history';
import {loadRegisteredMaterials,mergeRegisteredCatalog} from '@/lib/essay-runtime/registered-material-catalog';
import {publicCatalog} from '@/lib/essay-runtime/public-discovery';
import {sourceExams,type SourceExam} from '@/lib/essay-runtime/source-registry';
/** Reuse the source writer and submit gateway. No copied History or Provider path. */
export function ExamRewrite({runId,additional}:{runId:string;additional:boolean}){
 const auth=useAuth();const [state,setState]=useState<{exam:SourceExam;run:Record<string,unknown>}|null>(null),[error,setError]=useState(false);
 const [mathInputs,setMathInputs]=useState<Record<string,string>>({});
 const onInputContract=useCallback((_examId:string,math:Record<string,string>)=>setMathInputs(math),[]);
 const [drafts,setDrafts]=useState<Record<string,SubmissionDraft>>({});
 const onDraft=useCallback((key:string,body:string,images:boolean,saved:boolean)=>setDrafts(old=>({...old,[key]:{body,images,saved,revision:old[key]?.body===body?old[key].revision:(old[key]?.revision??0)+1}})),[]);
 const onDirty=useCallback(()=>{},[]);
 useEffect(()=>{let live=true;void(async()=>{
  if(!auth.client||!auth.user)return;const owner=auth.user.id;
  const runs=await readExamRuns(auth.client,owner,runId);if(runs.length!==1)throw Error();
  const session=(await auth.client.auth.getSession()).data.session;if(!session||session.user.id!==owner)throw Error();
  let exams:SourceExam[]=[];
  const universities=publicCatalog.universities.filter(u=>u.name===runs[0].university);
  if(universities.length===1){
   const sourceId=universities[0].sourceUniversityId;
   const registered=await loadRegisteredMaterials(auth.client,sourceId);
   exams=mergeRegisteredCatalog(sourceExams(sourceId),registered);
  }
  if(!exams.some(e=>e.dbExamId===runs[0].exam_id)){
   const response=await fetch('/api/essay/catalog',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});if(!response.ok)throw Error();
   const data=await response.json();exams=data.exams as SourceExam[];
  }
  const exam=exams.find(e=>e.dbExamId===runs[0].exam_id);if(!exam || !(runs[0].question_ids as string[]).every(id=>exam.questions.some(q=>q.dbQuestionId===id)))throw Error();
  if(live)setState({exam,run:runs[0]});
 })().catch(()=>{if(live)setError(true);});return()=>{live=false;};},[auth.client,auth.user,runId]);
 useEffect(()=>{if(state)logAnalytics(AE.essayRewriteStart,{source:additional?'paid_followup':'included'},runId);},[state,additional,runId]);
 if(error)return <p>기존 시험과 답안을 불러오지 못했어요. 다시 열어 주세요.</p>;
 if(!state||!auth.user)return <p>시험과 작성 중인 답안을 확인하고 있어요.</p>;
 const {exam,run}=state;const questions=exam.questions.filter(q=>(run.question_ids as string[]).includes(q.dbQuestionId??''));
 const root=String(run.parent_id??run.id);
 return <section><h3>다시 써보기</h3><p>최초 제출한 모든 문항의 답안을 준비해 주세요. 수정하지 않을 문항은 ‘이전 답안 불러오기’를 사용할 수 있습니다.</p>{questions.map(q=><div key={q.key} className="essay-rewrite-question"><SourceExamWriter supportsImages={q.inputMode==='image'||!!(q.dbQuestionId&&mathInputs[q.dbQuestionId])} exam={exam} question={q} owner={auth.user!.id} onDirty={onDirty} onDraft={onDraft} rewrite={{id:runId,additional,previousAnswer:String((run.answers as {questionId:string;body:string}[]).find(a=>a.questionId===q.dbQuestionId)?.body??'')}}/></div>)}<ScopedExamSubmit onInputContract={onInputContract} exam={exam} includedKeys={questions.map(q=>q.key)} drafts={drafts} cycle={additional?{previousPaidRunId:root}:{parentId:root}}/></section>;
}
