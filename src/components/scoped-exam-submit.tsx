'use client';
import {MathExamSessionSubmit} from './math-release/exam-session-submit';
import {MixedExamSubmit} from './mixed-exam-submit';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-context';
import {EssayExamSubmit,type SubmissionDraft} from './essay-exam-submit';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
/** Existing server admission is authority; metadata review state never activates evaluation. */
export function ScopedExamSubmit({exam,questionKey,drafts,includedKeys,cycle}:{cycle?:{parentId?:string;previousPaidRunId?:string};exam:SourceExam;questionKey?:string;includedKeys?:string[];drafts:Record<string,SubmissionDraft>}){
 const auth=useAuth(),owner=auth.user?.id;
 const [retry,setRetry]=useState(0),[failure,setFailure]=useState<string|null>(null);
 const scope=`${owner??''}:${exam.dbExamId??''}`;
 const [admitted,setAdmitted]=useState<{owner:string;exam:string;questions:string[];math:Record<string,string>}|null>(null);
 useEffect(()=>{let active=true;setFailure(null);
  void(async()=>{
   if(!auth.client||!owner||!exam.dbExamId)return;
   const session=(await auth.client.auth.getSession()).data.session;
   if(!active||session?.user.id!==owner)return;
   const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'availability',examId:exam.dbExamId}),cache:'no-store'});
   if(!response.ok)throw Error('ADMISSION_UNAVAILABLE');
   const result=await response.json();
   const math:Record<string,string>={};
   if(result?.ready===true&&result.mathQuestions&&typeof result.mathQuestions==='object'){
    for(const [id,leaf] of Object.entries(result.mathQuestions))if(typeof leaf==='string'&&/^[0-9a-f-]{36}$/i.test(id)&&/^[0-9a-f-]{36}$/i.test(leaf))math[id]=leaf;
   }
   if(result?.ready!==true){
    const response=await fetch('/api/essay/availability',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    if(!response.ok)throw Error('ADMISSION_UNAVAILABLE');
    const status=await response.json();
    if(status?.types?.math===true&&Array.isArray(status.mathQuestions))for(const row of status.mathQuestions){
     if(row.examId===exam.dbExamId&&typeof row.questionId==='string'&&typeof row.leafId==='string'&&/^[0-9a-f-]{36}$/i.test(row.leafId))math[row.questionId]=row.leafId;
    }
   }
   if(active)setAdmitted({owner,exam:exam.dbExamId,questions:result?.ready===true&&Array.isArray(result.questionIds)?result.questionIds.filter((v:unknown)=>typeof v==='string'):[],math});
  })().catch(()=>{if(active)setFailure(scope);});return()=>{active=false;};
 },[auth.client,owner,exam.dbExamId,retry,scope]);
 if(failure===scope)return <div role="status">일시적으로 첨삭 가능 여부를 확인할 수 없습니다. <button onClick={()=>{setFailure(null);setAdmitted(null);setRetry(v=>v+1);}}>다시 시도</button></div>;
 if(admitted?.owner!==owner||admitted?.exam!==exam.dbExamId)return <button disabled>첨삭 가능 여부 확인 중</button>;
 const q=exam.questions.find(q=>q.key===questionKey);
 const included=exam.questions.filter(q=>(drafts[q.key]?.body.trim()||drafts[q.key]?.images)&&(includedKeys===undefined||includedKeys.includes(q.key)));
 const ready=admitted?.owner===owner&&admitted?.exam===exam.dbExamId&&admitted.questions.length>0;
 const unavailable=ready&&included.some(q=>!q.dbQuestionId||!admitted.questions.includes(q.dbQuestionId));
 const mathLeaf=admitted?.owner===owner&&admitted?.exam===exam.dbExamId&&q?.dbQuestionId?admitted.math[q.dbQuestionId]:null;
 if(ready&&Object.keys(admitted.math).length&&!unavailable)return <MixedExamSubmit key={`${owner}:${exam.key}:${JSON.stringify(included.map(q=>[q.key,drafts[q.key]]))}`} exam={exam} drafts={drafts} included={included.map(q=>q.key)} leaves={admitted.math} cycle={cycle}/>;
 if(mathLeaf)return <><MathExamSessionSubmit key={`${owner}:${exam.key}`} exam={exam} drafts={drafts} included={included.map(q=>q.key)} leaves={admitted!.math}/></>;
 if(unavailable)return <p role="status">작성한 답안 중 아직 첨삭 준비 중인 문항이 있습니다. 답안은 저장되며, 해당 문항을 포함한 회차 첨삭은 준비가 완료되면 이용할 수 있습니다.</p>;
 return ready?<EssayExamSubmit key={`${owner}:${exam.key}`} exam={exam} included={included.map(q=>q.key)} drafts={drafts} cycle={cycle}/>:<button className="button button--primary service-preparing" disabled>첨삭 서비스 준비 중</button>;
}
