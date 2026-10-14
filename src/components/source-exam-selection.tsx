'use client';
import Link from 'next/link';
import {EssayExamSubmit,type SubmissionDraft} from './essay-exam-submit';
import {useCallback,useState,useEffect} from 'react';
import {useAuth} from './auth-context';
import {sourceExams,type SourceExam} from '@/lib/essay-runtime/source-registry';
import {SourceExamWriter} from './source-exam-writer';
export function SourceExamSelection({sourceId}:{sourceId:string}){
 const auth=useAuth();
 const [rows,setRows]=useState(()=>sourceExams(sourceId));
 useEffect(()=>{
  let active=true;
  // Clear former account metadata immediately; private responses are never cached.
  queueMicrotask(()=>{if(active)setRows(sourceExams(sourceId));});
  void (async()=>{
   let response:Response;
   const session=auth.client?(await auth.client.auth.getSession()).data.session:null;
   if(!active)return;
   if(session&&session.user.id===auth.user?.id){
    response=await fetch('/api/essay/catalog',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    if(!response.ok)response=await fetch('/api/essay/catalog');
   }else response=await fetch('/api/essay/catalog');
   if(!response.ok)return;
   const data=await response.json();
   if(active&&data.version==='essay-source-registry-v1'&&Array.isArray(data.exams))setRows(data.exams.filter((e:SourceExam)=>e.sourceUniversityId===sourceId&&e.verification==='VERIFIED'));
  })().catch(()=>{});
  return()=>{active=false;};
 },[sourceId,auth.client,auth.user?.id]);
 return <Selection key={`${sourceId}:${auth.user?.id??'guest'}`} rows={rows.some(e=>e.sourceUniversityId===sourceId)?rows.filter(e=>e.sourceUniversityId===sourceId):sourceExams(sourceId)} owner={auth.user?.id??'guest'}/>;
}
function Selection({rows,owner}:{rows:SourceExam[];owner:string}){
 const [year,setYear]=useState(''),[kind,setKind]=useState(''),[track,setTrack]=useState(''),[examKey,setExamKey]=useState(''),[questionKey,setQuestionKey]=useState('');
 const [included,setIncluded]=useState<string[]>([]);
 const [drafts,setDrafts]=useState<Record<string,SubmissionDraft>>({});
 const onDraft=useCallback((key:string,body:string,images:boolean)=>setDrafts(old=>({...old,[key]:{body,images,revision:old[key]?.body===body?old[key].revision:(old[key]?.revision??0)+1}})),[]);
 const [dirty,setDirty]=useState<Record<string,boolean>>({});
 const onDirty=useCallback((key:string,value:boolean)=>setDirty(old=>({...old,[key]:value})),[]);
 const years=[...new Set(rows.map(e=>String(e.year)))].sort().reverse();
 const selectedYear=year||(years.length===1?years[0]:'');
 const yearRows=rows.filter(e=>String(e.year)===selectedYear);
 const kinds=[...new Set(yearRows.map(e=>e.kind))],selectedKind=kind||(kinds.length===1?kinds[0]:'');
 const kindRows=yearRows.filter(e=>e.kind===selectedKind);
 const tracks=[...new Set(kindRows.map(e=>e.track))],selectedTrack=track||(tracks.length===1?tracks[0]:'');
 const exams=kindRows.filter(e=>e.track===selectedTrack),exam=exams.find(e=>e.key===examKey)??(exams.length===1?exams[0]:undefined);
 const question=exam?.questions.find(q=>q.key===questionKey)??exam?.questions[0];
 function reset(action:()=>void){if(Object.values(dirty).some(Boolean)&&!window.confirm('저장하지 못한 답안이 있습니다. 선택을 바꿀까요?'))return;action();setDirty({});setIncluded([]);setQuestionKey('');}
 return <section className="university-section essay-start" aria-label="논술 첨삭 시작">
  <div className="discovery-topline"><h2>논술 첨삭 시작</h2><Link href="/my/essays/">나의 첨삭 기록 →</Link></div>
  <div className="essay-selection-grid">
   <label>학년도<select aria-label="학년도" value={selectedYear} onChange={e=>reset(()=>{setYear(e.target.value);setKind('');setTrack('');setExamKey('');})}><option value="">학년도 선택</option>{years.map(y=><option key={y} value={y}>{y}학년도</option>)}</select></label>
   <label>시험 유형<select aria-label="시험 유형" disabled={!selectedYear} value={selectedKind} onChange={e=>reset(()=>{setKind(e.target.value);setTrack('');setExamKey('');})}><option value="">시험 유형 선택</option>{kinds.map(k=><option key={k} value={k}>{k==='mock'?'모의논술':'수시 논술'}</option>)}</select></label>
   <label>계열<select aria-label="계열" disabled={!selectedKind} value={selectedTrack} onChange={e=>reset(()=>{setTrack(e.target.value);setExamKey('');})}><option value="">계열 선택</option>{tracks.map(t=><option key={t}>{t}</option>)}</select></label>
   {exams.length>1&&<label>캠퍼스·시험 회차<select aria-label="캠퍼스·시험 회차" value={exam?.key??''} onChange={e=>reset(()=>setExamKey(e.target.value))}><option value="">시험 회차 선택</option>{exams.map(e=><option key={e.key} value={e.key}>{[e.campus,e.session].filter(Boolean).join(' · ')||'회차 구분 없음'}</option>)}</select></label>}
  </div>
  {exam&&<><div className="essay-question-tabs" role="tablist" aria-label="문항 선택">{exam.questions.map(q=><button className="button button--outline" key={q.key} role="tab" aria-selected={question?.key===q.key} onClick={()=>setQuestionKey(q.key)}>{q.label}</button>)}</div>
   {/인문|언어|사회|경제|경영|상경/.test(exam.track)&&<fieldset className="essay-submission-selection"><legend>첨삭받을 문항</legend><button className="button button--outline" onClick={()=>setIncluded(exam.questions.map(q=>q.key))}>전체 문항 선택</button>{exam.questions.map(q=><label key={q.key}><input type="checkbox" checked={included.includes(q.key)} onChange={e=>setIncluded(old=>e.target.checked?[...old,q.key]:old.filter(key=>key!==q.key))}/>{q.label}</label>)}<p>전체 또는 일부 문항을 선택할 수 있습니다. 최초 첨삭은 문항 묶음당 1 Credit, 14일 이내 같은 문항 집합의 재첨삭 1회가 포함됩니다. 최초 제출 후 새 문항은 추가할 수 없습니다.</p></fieldset>}
   {exam.questions.map(q=><div key={q.key} hidden={question?.key!==q.key}><SourceExamWriter key={`${owner}:${q.key}`} exam={exam} question={q} owner={owner} onDirty={onDirty} onDraft={onDraft}/></div>)}
   <EssayExamSubmit key={`${owner}:${exam.key}`} exam={exam} included={included} drafts={drafts}/>
  </>}
 </section>;
}
