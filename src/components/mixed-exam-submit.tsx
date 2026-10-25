'use client';
import {useCallback,useState} from 'react';
import {EssayExamSubmit,type SubmissionDraft} from './essay-exam-submit';
import {MathExamSessionSubmit} from './math-release/exam-session-submit';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
/** Reuse image confirmation only. The single Essay parent owns ALL billing. */
export function MixedExamSubmit({exam,drafts,included,leaves,cycle}:{cycle?:{parentId?:string;previousPaidRunId?:string};exam:SourceExam;drafts:Record<string,SubmissionDraft>;included:string[];leaves:Record<string,string>}){
 const [refs,setRefs]=useState<Record<string,{attemptId:string;confirmedRunId:string}>>({});
 const onReady=useCallback((value:Record<string,{attemptId:string;confirmedRunId:string}>)=>setRefs(value),[]);
 const images=included.filter(key=>drafts[key]?.images);
 const missing=images.some(key=>!refs[key]);
 const prepared=Object.fromEntries(Object.entries(drafts).map(([key,value])=>[key,{...value,...(refs[key]?{mathInput:refs[key]}:{})}]));
 return <>
  {images.length>0&&<MathExamSessionSubmit exam={exam} drafts={drafts} included={images} leaves={leaves} onInputsReady={onReady}/>}
  {missing?<button className="button button--primary" disabled>사진 답안 확인 후 첨삭 요청</button>:
   <EssayExamSubmit exam={exam} drafts={prepared} included={included} mathQuestions={Object.keys(leaves)} cycle={cycle}/>}
 </>;
}
