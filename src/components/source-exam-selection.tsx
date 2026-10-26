'use client';
import {isUniversityServicePreparing} from '@/lib/essay-runtime/catalog-policy';

import Link from 'next/link';
import {essayExamLabel} from './essay-exam-label';
import {type SubmissionDraft} from './essay-exam-submit';
import {useCallback,useState,useEffect} from 'react';
import {useAuth} from './auth-context';
import {sourceExams,type SourceExam} from '@/lib/essay-runtime/source-registry';
import {loadRegisteredMaterials,mergeRegisteredCatalog} from '@/lib/essay-runtime/registered-material-catalog';
import {ScopedExamSubmit} from './scoped-exam-submit';
import {SourceExamWriter} from './source-exam-writer';
export function SourceExamSelection({sourceId,registeredOnly=false,onSelectionChange}:{sourceId:string;registeredOnly?:boolean;onSelectionChange?:(title:string)=>void}){
 const auth=useAuth();
 const identity=`${sourceId}:${auth.user?.id??'guest'}`;
 const [loadedFor,setLoadedFor]=useState('');
 const [loadError,setLoadError]=useState(false);
 const [rows,setRows]=useState<SourceExam[]>(()=>registeredOnly?[]:sourceExams(sourceId));
 useEffect(()=>{
  let active=true;
  // Clear former account metadata immediately; private responses are never cached.
  queueMicrotask(()=>{if(active)setRows(registeredOnly?[]:sourceExams(sourceId));});
  void (async()=>{
   let response:Response;
   const session=auth.client?(await auth.client.auth.getSession()).data.session:null;
   if(!active)return;
   if(registeredOnly&&auth.client){
    const registered=await loadRegisteredMaterials(auth.client,sourceId);
    if(registered.length){if(active){setRows(mergeRegisteredCatalog(sourceExams(sourceId),registered));setLoadedFor(identity);setLoadError(false);}return;}
   }
   if(session&&session.user.id===auth.user?.id){
    response=await fetch('/api/essay/catalog',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    if(!response.ok){console.info('Essay registry HTTP',response.status);response=await fetch('/api/essay/catalog');}
   }else response=await fetch('/api/essay/catalog');
   if(!response.ok)throw Error('CATALOG_UNAVAILABLE');
   const data=await response.json();
   if(Number.isInteger(data.registration?.registeredQuestions))console.info('Essay registry HTTP verified',response.status,'registered questions',data.registration.registeredQuestions);
   if(data.version!=='essay-source-registry-v1'||!Array.isArray(data.exams))return;
   let next=(data.exams as SourceExam[]).filter(e=>e.sourceUniversityId===sourceId&&e.verification==='VERIFIED');
   if(registeredOnly){
    next=next.filter(e=>e.dbExamId).map(e=>({...e,questions:e.questions.filter(q=>q.dbQuestionId)})).filter(e=>e.questions.length);

   }
   if(active){setRows(next);setLoadedFor(identity);setLoadError(false);}
  })().catch(()=>{if(active){if(registeredOnly){setLoadError(true);setLoadedFor(identity);setRows([]);}}});
  return()=>{active=false;};
 },[sourceId,auth.client,auth.user?.id,registeredOnly,identity]);
 return <>{registeredOnly&&auth.user==null&&<p><Link href={`/login/?next=${encodeURIComponent(`/essay-lab/universities/${sourceId}/`)}`}>로그인</Link>하면 답안과 첨삭 기록을 보관할 수 있습니다.</p>}{loadError&&<p role="alert">등록 문항을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.</p>}<Selection onSelectionChange={onSelectionChange} key={`${sourceId}:${auth.user?.id??'guest'}`} rows={registeredOnly&&loadedFor!==identity?[]:rows.filter(e=>e.sourceUniversityId===sourceId)} owner={auth.user?.id??'guest'}/></>;
}
function Selection({rows,owner,onSelectionChange}:{rows:SourceExam[];owner:string;onSelectionChange?:(title:string)=>void}){
 const [period,setPeriod]=useState(''),[track,setTrack]=useState(''),[examKey,setExamKey]=useState(''),[questionKey,setQuestionKey]=useState('');
 const [panels,setPanels]=useState<Record<string,{open:string[];manual:boolean}>>({});
 const [inputContract,setInputContract]=useState<{examId:string;math:Record<string,string>}|null>(null);
 const onInputContract=useCallback((examId:string,math:Record<string,string>)=>setInputContract({examId,math}),[]);
 const [excluded,setExcluded]=useState<string[]>([]);
 const [drafts,setDrafts]=useState<Record<string,SubmissionDraft>>({});
 const onDraft=useCallback((key:string,body:string,images:boolean,saved:boolean)=>setDrafts(old=>({...old,[key]:{body,images,saved,revision:old[key]?.body===body?old[key].revision:(old[key]?.revision??0)+1}})),[]);
 const [dirty,setDirty]=useState<Record<string,boolean>>({});
 const onDirty=useCallback((key:string,value:boolean)=>setDirty(old=>({...old,[key]:value})),[]);
 const periods=[...new Set(rows.map(e=>`${e.year}:${e.kind}`))].sort((a,b)=>{
  const [ay,ak]=a.split(':'),[by,bk]=b.split(':');
  return Number(by)-Number(ay)||(ak===bk?0:ak==='admission'?-1:1);
 });
 const selectedPeriod=period||(periods.length===1?periods[0]:'');
 const kindRows=rows.filter(e=>`${e.year}:${e.kind}`===selectedPeriod);
 const tracks=[...new Set(kindRows.map(e=>e.track))],selectedTrack=track||(tracks.length===1?tracks[0]:'');
 const exams=kindRows.filter(e=>e.track===selectedTrack),exam=exams.find(e=>e.key===examKey)??(exams.length===1?exams[0]:undefined);
 const title=exam?essayExamLabel(exam):'학년도와 시험을 선택해 주세요.';
 useEffect(()=>{onSelectionChange?.(title);},[onSelectionChange,title]);
 const question=exam?.questions.find(q=>q.key===questionKey)??exam?.questions[0];
 // A sole question needs no second pick: auto-include it and drop the redundant tab/checklist.

 const written=exam?.questions.filter(q=>drafts[q.key]?.body.trim()||drafts[q.key]?.images)??[];
 const submitIncluded=written.filter(q=>!excluded.includes(q.key)).map(q=>q.key);
 function reset(action:()=>void){if(Object.values(dirty).some(Boolean)&&!window.confirm('저장하지 못한 답안이 있습니다. 선택을 바꿀까요?'))return;action();setDirty({});setExcluded([]);setQuestionKey('');}
 return <section className="university-section essay-start" aria-label="논술 첨삭 시작">
  <div className="discovery-topline"><h2>시험 선택</h2><Link href="/my/essays/">나의 첨삭 기록 →</Link></div>
  {!rows.length&&<p role="status">기출문제를 준비하고 있어요.</p>}
  <div className="essay-selection-grid">
   <label>학년도·시험<select aria-label="학년도·시험" value={selectedPeriod} onChange={e=>reset(()=>{setPeriod(e.target.value);setTrack('');setExamKey('');})}><option value="">학년도·시험 선택</option>{periods.map(p=>{const [year,kind]=p.split(':');return <option key={p} value={p}>{year}학년도 {kind==='mock'?'모의논술':kind==='admission'?'수시논술':'시험 유형 확인 중'}</option>;})}</select></label>
   <label>계열<select aria-label="계열" disabled={!selectedPeriod} value={selectedTrack} onChange={e=>reset(()=>{setTrack(e.target.value);setExamKey('');})}><option value="">계열 선택</option>{tracks.map(t=><option key={t}>{t}</option>)}</select></label>
   {exams.length>1&&<label>캠퍼스·시험 회차<select aria-label="캠퍼스·시험 회차" value={exam?.key??''} onChange={e=>reset(()=>setExamKey(e.target.value))}><option value="">시험 회차 선택</option>{exams.map(e=><option key={e.key} value={e.key}>{[e.campus,e.session].filter(Boolean).join(' · ')||'회차 구분 없음'}</option>)}</select></label>}
  </div>
  {exam&&<>{exam.dbExamId==='942c1c43-914f-5b99-9a30-e6474c363f6f'&&<p role="note">이 시험은 승인된 문제 2만 첨삭할 수 있습니다. 나머지 문항은 첨삭 준비 중이며 전체 회차 공개 완료가 아닙니다.</p>}
   <p className="essay-submit-note">답안 저장은 무료입니다. 작성한 답안을 시험 회차 단위로 함께 첨삭하며, 새 첨삭 회차에는 문항 수와 관계없이 1 크레딧이 사용됩니다. 이전에 제출하지 않은 문항을 나중에 첨삭받으면 새 회차로 1 크레딧이 사용됩니다.</p>
   {written.length>1&&<fieldset className="essay-submission-selection"><legend>이번 첨삭 회차에 제출할 답안</legend>{written.map(q=><label key={q.key}><input type="checkbox" checked={!excluded.includes(q.key)} onChange={e=>setExcluded(old=>e.target.checked?old.filter(key=>key!==q.key):[...old,q.key])}/>{q.label}</label>)}<p>선택하지 않은 답안과 기존 첨삭 기록은 그대로 보존됩니다. 무료 재첨삭은 기존 회차의 문항으로만 요청할 수 있습니다.</p></fieldset>}
   {exam.questions.map((q,index)=>{const expanded=(panels[exam.key]?.open??[exam.questions[0].key]).includes(q.key),draft=drafts[q.key];return <section className="essay-question-toggle" key={q.key} id={`essay-question-${q.key}`}><header><h3>{q.label}</h3><span>{draft?.body.trim()||draft?.images?'답안 작성됨':'미작성'} · {draft===undefined?'답안 확인 중':draft.saved?'저장됨':'저장 확인 필요'}</span><button type="button" className="button button--outline" aria-expanded={expanded} aria-controls={`answer-panel-${q.key}`} onClick={()=>{setQuestionKey(q.key);setPanels(old=>{const open=old[exam.key]?.open??[exam.questions[0].key];return {...old,[exam.key]:{manual:true,open:expanded?open.filter(k=>k!==q.key):[...open,q.key]}};});}}>{expanded?'접기':'펼치기'} · {q.label}</button></header><div id={`answer-panel-${q.key}`} hidden={!expanded}><SourceExamWriter key={`${owner}:${q.key}`} exam={exam} question={q} owner={owner} onDirty={onDirty} onDraft={onDraft} supportsImages={q.inputMode==='image'||!!(inputContract?.examId===exam.dbExamId&&q.dbQuestionId&&inputContract.math[q.dbQuestionId])} onSaved={()=>setPanels(old=>{if(old[exam.key]?.manual)return old;const next=exam.questions.slice(index+1).find(item=>!drafts[item.key]?.body.trim()&&!drafts[item.key]?.images);return next?{...old,[exam.key]:{manual:false,open:[next.key]}}:old;})}/></div></section>;})}
   {isUniversityServicePreparing(exam.sourceUniversityId)?<button className="button button--primary service-preparing" disabled>첨삭 서비스 준비 중</button>:<ScopedExamSubmit onInputContract={onInputContract} exam={exam} questionKey={question?.key} drafts={drafts} includedKeys={submitIncluded}/>}

  </>}
 </section>;
}
