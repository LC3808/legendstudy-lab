'use client';
import {isUniversityServicePreparing} from '@/lib/essay-runtime/catalog-policy';

import Link from 'next/link';
import {loadRegisteredMaterials} from '@/lib/essay-runtime/registered-material-catalog';
import {catalogUniversity} from '@/lib/essay-runtime/public-discovery';
import {QuestionMaterialAccess} from './question-material-access';
import {DbExamSubmit} from './db-exam-submit';
import type {SubmissionDraft} from './essay-exam-submit';
import {SourceExamSelection} from './source-exam-selection';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from './auth-context';
import {EssayQuestionDraft} from './essay-service-workspace';
import {loadExams,loadQuestions,officialUrl,type Exam,type Question} from '@/lib/essay-runtime/catalog';

type ReadyExam=Exam&{questions:Question[];reviewRequired?:boolean};
export function UniversityEssayStart({universityId,sourceId}:{universityId:string|null;sourceId:string}){
 const auth=useAuth();
 // Remount all private draft/selection state on account changes.
 return <Selection key={`${auth.user?.id??'guest'}:${universityId}`} universityId={universityId} sourceId={sourceId}/>;
}
function Selection({universityId,sourceId}:{universityId:string|null;sourceId:string}){
 const {client,user,status:authStatus}=useAuth();
 const [rows,setRows]=useState<ReadyExam[]>([]),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [year,setYear]=useState(''),[kind,setKind]=useState(''),[campus,setCampus]=useState(''),[track,setTrack]=useState(''),[examId,setExamId]=useState(''),[questionId,setQuestionId]=useState('');
 const [visited,setVisited]=useState<string[]>([]),[included,setIncluded]=useState<string[]|null>(null),[dirty,setDirty]=useState<Record<string,boolean>>({});
 const [drafts,setDrafts]=useState<Record<string,SubmissionDraft>>({});
 const onSubmissionDraft=useCallback((id:string,draft:SubmissionDraft)=>setDrafts(old=>({...old,[id]:draft})),[]);
 const onDirty=useCallback((id:string,value:boolean)=>setDirty(old=>old[id]===value?old:{...old,[id]:value}),[]);
 useEffect(()=>{
  let active=true;
  if(!client||!user||!universityId)return;
  void loadExams(client).then(async all=>{
   const exams=all.filter(e=>e.university_id===universityId);
   const ready:ReadyExam[]=[];
   // Bounded serial reads; empty exams must not create selectable years/tracks.
   for(const exam of exams){if(!active)return;const questions=await loadQuestions(client,exam.id);if(questions.length)ready.push({...exam,questions});}
   const university=catalogUniversity(sourceId);
   if(university){
    const registered=await loadRegisteredMaterials(client,sourceId);
    for(const row of registered){
     if(ready.some(e=>e.id===row.dbExamId))continue;
     ready.push({id:row.dbExamId!,university_id:row.universityId!,admission_year:row.year,exam_name:row.session||row.track,exam_kind:row.kind,campus:row.campus,field_or_division:row.track,admission_track:row.track,official_source_url:null,universities:{name:university.name,slug:sourceId},reviewRequired:true,questions:row.questions.map(q=>({id:q.dbQuestionId!,essay_exam_id:row.dbExamId!,question_key:q.key,label:q.label,metadata_version:'browse-only',length_min:null,length_max:null,length_count_rule:null,time_limit_seconds:null}))});
    }
   }
   if(active){setRows(ready);setStatus('ready');}
  }).catch(()=>{if(active)setStatus('error');});
  return()=>{active=false;};
 },[client,user,universityId,sourceId]);
 function change(action:()=>void){
  if(Object.values(dirty).some(Boolean)&&!window.confirm('저장하지 않은 답안이 있습니다. 문항별 답안을 저장하지 않고 선택을 바꿀까요?'))return;
  setDrafts({});setVisited([]);setIncluded(null);setQuestionId('');setDirty({});action();
 }
 const years=[...new Set(rows.map(e=>e.admission_year))].sort((a,b)=>b-a);
 const selectedYear=year||(years.length===1?String(years[0]):'');
 const yearRows=rows.filter(e=>String(e.admission_year)===selectedYear);
 const kinds=[...new Set(yearRows.map(e=>e.exam_kind??'unknown'))];
 const selectedKind=kinds.length===1?kinds[0]:kind;
 const kindRows=yearRows.filter(e=>(e.exam_kind??'unknown')===selectedKind);
 const campuses=[...new Set(kindRows.map(e=>e.campus??'__unspecified'))];
 const campusRows=kindRows.filter(e=>campuses.length<=1||(e.campus??'__unspecified')===campus);
 const tracks=[...new Set(campusRows.map(e=>e.field_or_division??e.exam_name))];
 const selectedTrack=track||(tracks.length===1?tracks[0]:'');
 const exams=campusRows.filter(e=>(e.field_or_division??e.exam_name)===selectedTrack);
 const exam=exams.find(e=>e.id===examId)??(exams.length===1?exams[0]:undefined);
 const questionIds=exam?.questions.map(q=>q.id)??[];
 const selectedQuestionId=questionId||(exam?.questions.length===1?exam.questions[0].id:'');
 const selectedIds=included??(exam?.questions.length===1?[exam.questions[0].id]:[]);
 const question=exam?.questions.find(q=>q.id===selectedQuestionId);
 // A display-policy distinction only; never used to authorize a Provider or bill.
 const preparing=isUniversityServicePreparing(sourceId);
 const examUnit=!preparing&&!!exam&&!exam.reviewRequired&&/인문|언어|사회|경제|경영/.test(exam.field_or_division??'');
 // A sole question is auto-selected: drop the redundant "select all" and multi-question copy.
 const single=!!exam&&exam.questions.length===1;
 function chooseQuestion(id:string){setQuestionId(id);if(id)setVisited(old=>old.includes(id)?old:[...old,id]);}
 if(catalogUniversity(sourceId)&&(!universityId||(authStatus==='anonymous'||authStatus==='unconfigured')||(status==='ready'&&!rows.length)))return <SourceExamSelection sourceId={sourceId} registeredOnly/>;
 return <section className="university-section essay-start" aria-label="논술 첨삭 시작">
  <div className="discovery-topline"><h2>{preparing?'기출문항 조회':'논술 첨삭 시작'}</h2><Link href="/my/essays/">나의 첨삭 기록 →</Link></div>
  {!universityId?<p className="university-empty">기출문제를 준비하고 있어요.</p>:authStatus==='loading'?<p role="status">로그인을 확인하고 있습니다.</p>:!user||!client?<p><Link href={`/login/?next=${encodeURIComponent(`/essay-lab/universities/${sourceId}/`)}`}>로그인</Link>하면 이용 가능한 기출문항을 확인하고 답안을 이어 쓸 수 있습니다.</p>:status==='loading'?<p role="status">기출문항을 불러오고 있습니다.</p>:status==='error'?<p role="alert">기출문항을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.</p>:!rows.length?<p className="university-empty">기출문제를 준비하고 있어요.</p>:<>
   <div className="essay-selection-grid">
    <label>학년도<select value={selectedYear} onChange={e=>change(()=>{setYear(e.target.value);setKind('');setCampus('');setTrack('');setExamId('');})}><option value="">학년도 선택</option>{years.map(y=><option key={y} value={y}>{y}학년도</option>)}</select></label>
    {kinds.length>1&&<label>시험 유형<select value={kind} onChange={e=>change(()=>{setKind(e.target.value);setCampus('');setTrack('');setExamId('');})}><option value="">시험 유형 선택</option>{kinds.map(k=><option key={k} value={k}>{k==='admission'?'수시논술':k==='mock'?'모의논술':'기타 시험'}</option>)}</select></label>}
    {campuses.length>1&&<label>캠퍼스<select value={campus} onChange={e=>change(()=>{setCampus(e.target.value);setTrack('');setExamId('');})}><option value="">캠퍼스 선택</option>{campuses.map(c=><option key={c} value={c}>{c==='__unspecified'?'캠퍼스 정보 미등록':c}</option>)}</select></label>}
    <label>계열<select disabled={!selectedYear||!selectedKind} value={selectedTrack} onChange={e=>change(()=>{setTrack(e.target.value);const matches=campusRows.filter(x=>(x.field_or_division??x.exam_name)===e.target.value);setExamId(matches.length===1?matches[0].id:'');})}><option value="">계열 선택</option>{tracks.map(t=><option key={t}>{t}</option>)}</select></label>
    {exams.length>1&&<label>시험 회차<select value={examId} onChange={e=>change(()=>setExamId(e.target.value))}><option value="">시험 선택</option>{exams.map(e=><option key={e.id} value={e.id}>{e.exam_name}</option>)}</select></label>}
    <label>문항<select disabled={!exam} value={selectedQuestionId} onChange={e=>chooseQuestion(e.target.value)}><option value="">문항 선택</option>{exam?.questions.map(q=><option key={q.id} value={q.id}>{q.label}</option>)}</select></label>
   </div>
   {exam&&<>
    {officialUrl(exam.official_source_url)&&<p><a href={officialUrl(exam.official_source_url)!} target="_blank" rel="noopener noreferrer">선택한 시험의 공식 기출자료 확인 ↗</a></p>}
    {examUnit&&<div className="essay-submission-selection"><p>{single?'이 문항을 첨삭 제출에 포함할지 선택하세요.':'이 시험에서 첨삭받을 문항을 선택하세요. 전체 또는 일부 문항을 함께 제출할 수 있습니다.'}</p>
     {!single&&<button className="button button--outline" onClick={()=>setIncluded(exam.questions.map(q=>q.id))}>전체 문항 선택</button>}
     {question&&<label><input type="checkbox" checked={selectedIds.includes(question.id)} onChange={e=>setIncluded(e.target.checked?[...selectedIds,question.id]:selectedIds.filter(id=>id!==question.id))}/>{question.label} 제출에 포함</label>}
     <p role="status">선택한 문항 {selectedIds.length} / {exam.questions.length}</p>
    </div>}
    {!preparing&&!exam.reviewRequired&&exam.questions.filter(q=>(visited.includes(q.id)||q.id===selectedQuestionId)).map(q=><div key={q.id} hidden={q.id!==selectedQuestionId}><EssayQuestionDraft questionId={q.id} onDirtyChange={onDirty} onSubmissionDraft={onSubmissionDraft}/></div>)}
    {question&&(exam.reviewRequired||preparing)&&<QuestionMaterialAccess sourceId={sourceId} year={exam.admission_year} kind={exam.exam_kind??'unknown'} track={exam.field_or_division??exam.exam_name} label={question.label}/>}
    {question&&<div className="essay-submit-gate">
     {examUnit&&<p>선택한 문항 묶음의 최초 첨삭은 1 Credit이며, 14일 이내 같은 문항 집합의 재첨삭 1회가 포함됩니다. 최초 제출 후에는 새 문항을 추가할 수 없습니다.</p>}
     {preparing?<button className="button button--primary service-preparing" disabled>서비스 준비중</button>:exam.reviewRequired?<><p role="status">자료 검수 중입니다. 시험·문항 목록은 조회할 수 있지만, 공개 승인된 문제 본문은 아직 연결되지 않았습니다. 상단 공식 자료 링크가 있다면 해당 학년도·시험을 확인해 주세요. AI 첨삭은 준비 중입니다.</p><button className="button button--primary" disabled>첨삭 준비 중</button></>:<DbExamSubmit key={exam.id} examId={exam.id} questionIds={questionIds} included={examUnit?selectedIds:[question.id]} drafts={drafts}/>}
    </div>}
   </>}
  </>}
 </section>;
}
