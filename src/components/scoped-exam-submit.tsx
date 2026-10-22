'use client';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-context';
import {EssayExamSubmit,type SubmissionDraft} from './essay-exam-submit';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
/** Existing server admission is authority; metadata review state never activates evaluation. */
export function ScopedExamSubmit({exam,questionKey,drafts}:{exam:SourceExam;questionKey?:string;drafts:Record<string,SubmissionDraft>}){
 const auth=useAuth(),owner=auth.user?.id;
 const [admitted,setAdmitted]=useState<{owner:string;exam:string;questions:string[]}|null>(null);
 useEffect(()=>{let active=true;
  void(async()=>{
   if(!auth.client||!owner||!exam.dbExamId)return;
   const session=(await auth.client.auth.getSession()).data.session;
   if(!active||session?.user.id!==owner)return;
   const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'availability',examId:exam.dbExamId}),cache:'no-store'});
   if(!response.ok)return;const result=await response.json();
   if(active&&result.ready===true&&Array.isArray(result.questionIds))setAdmitted({owner,exam:exam.dbExamId,questions:result.questionIds.filter((v:unknown)=>typeof v==='string')});
  })().catch(()=>{});return()=>{active=false;};
 },[auth.client,owner,exam.dbExamId]);
 const q=exam.questions.find(q=>q.key===questionKey);
 const ready=admitted?.owner===owner&&admitted?.exam===exam.dbExamId&&q?.dbQuestionId&&admitted?.questions.includes(q.dbQuestionId);
 return ready&&q?<EssayExamSubmit key={`${owner}:${exam.key}:${q.key}`} exam={exam} included={[q.key]} drafts={drafts}/>:<button className="button button--primary service-preparing" disabled>첨삭 서비스 준비 중</button>;
}
