'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-context';
import {EssayExamSubmit,type SubmissionDraft} from './essay-exam-submit';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
/** Existing server admission is authority; metadata review state never activates evaluation. */
export function ScopedExamSubmit({exam,questionKey,drafts,includedKeys}:{exam:SourceExam;questionKey?:string;includedKeys?:string[];drafts:Record<string,SubmissionDraft>}){
 const auth=useAuth(),owner=auth.user?.id;
 const [admitted,setAdmitted]=useState<{owner:string;exam:string;questions:string[];math:Record<string,string>}|null>(null);
 useEffect(()=>{let active=true;
  void(async()=>{
   if(!auth.client||!owner||!exam.dbExamId)return;
   const session=(await auth.client.auth.getSession()).data.session;
   if(!active||session?.user.id!==owner)return;
   const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'availability',examId:exam.dbExamId}),cache:'no-store'});
   const result=response.ok?await response.json():null;
   const math:Record<string,string>={};
   if(result?.ready!==true){
    const response=await fetch('/api/essay/availability',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    const status=response.ok?await response.json():null;
    if(status?.types?.math===true&&Array.isArray(status.mathQuestions))for(const row of status.mathQuestions){
     if(row.examId===exam.dbExamId&&typeof row.questionId==='string'&&typeof row.leafId==='string'&&/^[0-9a-f-]{36}$/i.test(row.leafId))math[row.questionId]=row.leafId;
    }
   }
   if(active)setAdmitted({owner,exam:exam.dbExamId,questions:result?.ready===true&&Array.isArray(result.questionIds)?result.questionIds.filter((v:unknown)=>typeof v==='string'):[],math});
  })().catch(()=>{});return()=>{active=false;};
 },[auth.client,owner,exam.dbExamId]);
 const q=exam.questions.find(q=>q.key===questionKey);
 const included=exam.questions.filter(q=>(drafts[q.key]?.body.trim()||drafts[q.key]?.images)&&(includedKeys===undefined||includedKeys.includes(q.key)));
 const ready=admitted?.owner===owner&&admitted?.exam===exam.dbExamId&&admitted.questions.length>0;
 const unavailable=ready&&included.some(q=>!q.dbQuestionId||!admitted.questions.includes(q.dbQuestionId));
 const mathLeaf=admitted?.owner===owner&&admitted?.exam===exam.dbExamId&&q?.dbQuestionId?admitted.math[q.dbQuestionId]:null;
 if(mathLeaf)return <Link className="button button--primary" href={`/math/?leaf=${encodeURIComponent(mathLeaf)}`}>수리논술 첨삭하기</Link>;
 if(unavailable)return <p role="status">작성한 답안 중 아직 첨삭 준비 중인 문항이 있습니다. 답안은 저장되며, 해당 문항을 포함한 회차 첨삭은 준비가 완료되면 이용할 수 있습니다.</p>;
 return ready?<EssayExamSubmit key={`${owner}:${exam.key}`} exam={exam} included={included.map(q=>q.key)} drafts={drafts}/>:<button className="button button--primary service-preparing" disabled>첨삭 서비스 준비 중</button>;
}
