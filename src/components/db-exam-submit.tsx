'use client';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-context';
import {type SubmissionDraft} from './essay-exam-submit';
import {ScopedExamSubmit} from './scoped-exam-submit';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
/** Registry metadata supplies reviewed identity; worker admission remains authoritative. */
export function DbExamSubmit({examId,questionIds,included,drafts}:{examId:string;questionIds:string[];included:string[];drafts:Record<string,SubmissionDraft>}){
 const {client,user}=useAuth();const identity=JSON.stringify([user?.id,examId,questionIds]);
 const [reviewed,setReviewed]=useState<{identity:string;exam:SourceExam}|null>(null);
 const exam=reviewed?.identity===identity?reviewed.exam:null;
 useEffect(()=>{let active=true;void(async()=>{
  const ids=JSON.parse(identity)[2] as string[];
  const session=(await client?.auth.getSession())?.data.session;
  if(!session||session.user.id!==user?.id)return;
  const r=await fetch('/api/essay/catalog',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
  if(!r.ok)return;const data=await r.json();
  if(!active||data.version!=='essay-source-registry-v1'||!Array.isArray(data.exams))return;
  const found=data.exams.find((e:SourceExam)=>e.dbExamId===examId&&e.verification==='VERIFIED');
  if(found&&Array.isArray(found.questions)&&found.questions.every((q:SourceExam['questions'][number])=>q.dbQuestionId&&ids.includes(q.dbQuestionId)))setReviewed({identity,exam:found});
 })().catch(()=>{});return()=>{active=false;};},[client,user?.id,examId,identity]);
 if(!exam||included.some(id=>!exam.questions.some(q=>q.dbQuestionId===id)))return <p role="status">문항과 평가자료의 연결을 확인하고 있습니다. 답안 저장은 계속 이용할 수 있습니다.</p>;
 const selected=exam.questions.filter(q=>included.includes(q.dbQuestionId!));
 const mapped=Object.fromEntries(exam.questions.map(q=>[q.key,drafts[q.dbQuestionId!]]));
 return <ScopedExamSubmit key={`${user?.id}:${examId}`} exam={exam} includedKeys={selected.map(q=>q.key)} drafts={mapped}/>;
}
