'use client';
import {useCallback,useState} from 'react';
import {EssayExamSubmit,type SubmissionDraft} from './essay-exam-submit';
import {MathExamSessionSubmit} from './math-release/exam-session-submit';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
/** Reuse image confirmation only. The single Essay parent owns ALL billing. */
export function MixedExamSubmit({exam,drafts,included,leaves,cycle}:{cycle?:{parentId?:string;previousPaidRunId?:string};exam:SourceExam;drafts:Record<string,SubmissionDraft>;included:string[];leaves:Record<string,string>}){
 const fingerprint=JSON.stringify(included.map(key=>[key,drafts[key]]));
 const [preparedRefs,setRefs]=useState<{fingerprint:string;refs:Record<string,{attemptId:string;confirmedRunId:string}>}|null>(null);
 const refs=preparedRefs?.fingerprint===fingerprint?preparedRefs.refs:{};
 const onReady=useCallback((value:Record<string,{attemptId:string;confirmedRunId:string}>)=>setRefs({fingerprint,refs:value}),[fingerprint]);
 const images=included.filter(key=>drafts[key]?.images);
 const missing=images.some(key=>!refs[key]);
 const prepared=Object.fromEntries(Object.entries(drafts).map(([key,value])=>[key,{...value,...(refs[key]?{mathInput:refs[key]}:{})}]));
 return <>
  {images.length>0&&<MathExamSessionSubmit key={fingerprint} exam={exam} drafts={drafts} included={images} leaves={leaves} onInputsReady={onReady} restoreExistingInputs/>}
  {missing&&<p>사진에서 읽은 내용을 확인하고 ‘이 내용으로 확인’을 누르면 회차 첨삭을 요청할 수 있습니다.</p>}
  <EssayExamSubmit exam={exam} drafts={prepared} included={included} mathQuestions={Object.keys(leaves)} cycle={cycle} inputBlocked={missing}/>
 </>;
}
