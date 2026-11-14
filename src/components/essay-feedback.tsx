"use client";
import "./essay-feedback.css";
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './auth-context';
export const qualityCategories={helpful:'첨삭 내용이 도움이 되었어요',inaccurate:'첨삭 내용이 부정확해요',rubric:'평가기준이 잘못 적용된 것 같아요',score:'점수 또는 평가 결과가 이상해요',unclear:'설명이 이해하기 어려워요',function:'기능이 정상적으로 작동하지 않아요',other:'기타 의견'};
export const bugCategories={submission:'답안 제출 오류',ocr:'OCR 인식 오류',evaluation:'평가 실패',result:'평가 결과 오류',rewrite:'재첨삭 오류',credit:'이용권 오류',display:'화면 표시 오류',other:'기타'};
export const positiveReasons={accurate_diagnosis:'부족한 부분을 정확히 알려줌',rubric_understanding:'대학 평가기준 이해에 도움',specific_feedback:'구체적인 피드백',rewrite_help:'재작성에 도움',clear_explanation:'이해하기 쉬운 설명'};
export const negativeReasons={inaccurate:'평가 정확성 부족',abstract:'추상적인 피드백',unsupported_claim:'실제 답안과 다른 지적',rubric_connection:'평가기준 연결 부족',slow:'긴 첨삭 시간',complex:'복잡한 이용 방법'};
export const feedbackThanks='의견을 보내주셔서 감사합니다. 더 나은 논술 LAB을 만드는 데 활용하겠습니다.';
export function feedbackReference(value?:string){return value&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)?value:undefined;}
export function EssayFeedback({evaluationRef,bugOnly=false,resultEnabled=false}:{evaluationRef?:string;bugOnly?:boolean;resultEnabled?:boolean}){
 if(!resultEnabled&&process.env.NEXT_PUBLIC_ESSAY_FEEDBACK_V1_ENABLED!=='true')return null;
 return <ConnectedFeedback evaluationRef={evaluationRef} bugOnly={bugOnly}/>;
}
function ConnectedFeedback({evaluationRef,bugOnly}:{evaluationRef?:string;bugOnly:boolean}){
 const {client,user,status}=useAuth();
 if(!client||!user||status!=='authenticated')return <p>로그인 후 논술 LAB 의견·오류 신고를 보낼 수 있어요.</p>;
 return <FeedbackEntry key={user.id+'/'+evaluationRef} evaluationRef={evaluationRef} bugOnly={bugOnly} submit={async(p)=>{
 const current=await client.auth.getUser();if(current.data.user?.id!==user.id)throw Error('SIGNED_OUT');
 const {error}=await client.rpc('essay_feedback_submit',{p:{...p,platform:'web',app_version:process.env.NEXT_PUBLIC_RELEASE_VERSION||'unknown'}});if(error)throw error;
 }}/>;
}
function FeedbackEntry(props:{evaluationRef?:string;bugOnly:boolean;submit:(p:Record<string,unknown>)=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),[open,setOpen]=useState(false);
 const numeric=process.env.NEXT_PUBLIC_ESSAY_SATISFACTION_V2_ENABLED==='true'&&!props.bugOnly;
 useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
 if(!numeric)return <EssayFeedbackForm {...props}/>;
 return <><button onClick={()=>setOpen(true)}>첨삭 만족도·의견 남기기 (선택)</button>{open&&<dialog ref={dialog} aria-label="첨삭 만족도" onCancel={()=>setOpen(false)} style={{maxWidth:'min(36rem, calc(100vw - 32px))',maxHeight:'85vh',overflow:'auto'}}><button onClick={()=>{dialog.current?.close();setOpen(false);}}>닫기</button><EssayFeedbackForm {...props} numeric/></dialog>}</>;
}
export function EssayFeedbackForm({evaluationRef,bugOnly=false,numeric=false,submit}:{evaluationRef?:string;bugOnly?:boolean;numeric?:boolean;submit:(p:Record<string,unknown>)=>Promise<void>}){
 const [bug,setBug]=useState(bugOnly),[sat,setSat]=useState(''),[category,setCategory]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 const [rating,setRating]=useState(0),[positive,setPositive]=useState<string[]>([]),[negative,setNegative]=useState<string[]>([]);
 const lock=useRef(false),pending=useRef<Record<string,unknown>|null>(null);
 function edit(){pending.current=null;}
 async function send(){if(lock.current||sent)return;if(bug?(!category||!message.trim()):!(numeric?rating:sat)){setError(bug?'오류 유형과 설명을 입력해 주세요.':'만족도를 선택해 주세요.');return;}lock.current=true;setBusy(true);setError('');
 const reference=feedbackReference(evaluationRef);
 pending.current??={request_key:crypto.randomUUID(),kind:bug?'bug':'quality',...(!bug?(numeric?{rating,positive_reasons:positive,negative_reasons:negative}:{satisfaction:sat}):{}),...(category?{category}:{}),message:message.trim(),...(reference?{evaluation_ref:reference}:{}),occurred_at:new Date().toISOString()};
 try{await submit(pending.current);setSent(true);}catch{setError('접수를 확인하지 못했어요. 입력은 보존됩니다. 잠시 후 다시 시도해 주세요.');}finally{lock.current=false;setBusy(false);}}
 if(sent)return <p role="status">{feedbackThanks}</p>;
 return <section className="my-panel essay-feedback"><h3>{bug?'논술 LAB 오류 신고':numeric?'이번 첨삭이 얼마나 도움이 되었나요?':'이번 첨삭이 도움이 되었나요?'}</h3><form onSubmit={e=>{e.preventDefault();void send();}}><fieldset disabled={busy}>
 {!bugOnly&&<label><input type="checkbox" checked={bug} onChange={e=>{setBug(e.target.checked);setCategory('');edit();}}/>오류 신고하기</label>}
 {!bug&&!numeric&&<div>{Object.entries({helpful:'도움이 되었어요',unhelpful:'아쉬워요'}).map(([v,label])=><label key={v}><input type="radio" name="satisfaction" value={v} checked={sat===v} onChange={()=>{setSat(v);edit();}}/>{label}</label>)}</div>}
 {!bug&&numeric&&<><fieldset><legend>만족도 (1점 매우 아쉬움 · 5점 매우 도움)</legend>{[1,2,3,4,5].map(value=><label key={value}><input type="radio" name="rating" checked={rating===value} onChange={()=>{setRating(value);edit();}}/>{value}점</label>)}</fieldset>{([{label:'좋았던 점 (선택)',items:positiveReasons,values:positive,set:setPositive},{label:'아쉬웠던 점 (선택)',items:negativeReasons,values:negative,set:setNegative}]).map(group=><fieldset key={group.label}><legend>{group.label}</legend>{Object.entries(group.items).map(([key,label])=><label key={key}><input type="checkbox" checked={group.values.includes(key)} onChange={e=>{group.set(e.target.checked?[...group.values,key]:group.values.filter(value=>value!==key));edit();}}/>{label}</label>)}</fieldset>)}</>}
 <label>{bug?'오류 유형' :'세부 유형 (선택)'}<select value={category} onChange={e=>{setCategory(e.target.value);edit();}}><option value="">선택</option>{Object.entries(bug?bugCategories:qualityCategories).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label>{bug?'오류 설명':'첨삭 결과에 대한 의견을 자유롭게 남겨주세요.'}<textarea maxLength={5000} value={message} onChange={e=>{setMessage(e.target.value);edit();}}/></label>
 <p>답안 원문과 민감정보는 자동 첨부하지 않습니다. 비밀번호 등은 입력하지 마세요.</p><button type="submit">{busy?'보내는 중…':'제출하기'}</button></fieldset>{error&&<p role="alert">{error}</p>}</form></section>;
}
