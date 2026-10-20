'use client';
import Link from 'next/link';
import {DbExamSubmit} from './db-exam-submit';
import type {SubmissionDraft} from './essay-exam-submit';
import {sourceExams} from '@/lib/essay-runtime/source-registry';
import {SourceExamSelection} from './source-exam-selection';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from './auth-context';
import {EssayQuestionDraft} from './essay-service-workspace';
import {loadExams,loadQuestions,officialUrl,type Exam,type Question} from '@/lib/essay-runtime/catalog';

type ReadyExam=Exam&{questions:Question[]};
export function UniversityEssayStart({universityId,sourceId}:{universityId:string|null;sourceId:string}){
 const auth=useAuth();
 // Remount all private draft/selection state on account changes.
 return <Selection key={`${auth.user?.id??'guest'}:${universityId}`} universityId={universityId} sourceId={sourceId}/>;
}
function Selection({universityId,sourceId}:{universityId:string|null;sourceId:string}){
 const {client,user,status:authStatus}=useAuth();
 const [rows,setRows]=useState<ReadyExam[]>([]),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [year,setYear]=useState(''),[campus,setCampus]=useState(''),[track,setTrack]=useState(''),[examId,setExamId]=useState(''),[questionId,setQuestionId]=useState('');
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
   if(active){setRows(ready);setStatus('ready');}
  }).catch(()=>{if(active)setStatus('error');});
  return()=>{active=false;};
 },[client,user,universityId]);
 function change(action:()=>void){
  if(Object.values(dirty).some(Boolean)&&!window.confirm('저장하지 않은 답안이 있습니다. 문항별 답안을 저장하지 않고 선택을 바꿀까요?'))return;
  setDrafts({});setVisited([]);setIncluded(null);setQuestionId('');setDirty({});action();
 }
 const years=[...new Set(rows.map(e=>e.admission_year))].sort((a,b)=>b-a);
 const yearRows=rows.filter(e=>String(e.admission_year)===year);
 const campuses=[...new Set(yearRows.map(e=>e.campus??'__unspecified'))];
 const campusRows=yearRows.filter(e=>campuses.length<=1||(e.campus??'__unspecified')===campus);
 const tracks=[...new Set(campusRows.map(e=>e.field_or_division??e.exam_name))];
 const exams=campusRows.filter(e=>(e.field_or_division??e.exam_name)===track);
 const exam=exams.find(e=>e.id===examId);
 const questionIds=exam?.questions.map(q=>q.id)??[];
 const selectedQuestionId=questionId||(exam?.questions.length===1?exam.questions[0].id:'');
 const selectedIds=included??(exam?.questions.length===1?[exam.questions[0].id]:[]);
 const question=exam?.questions.find(q=>q.id===selectedQuestionId);
 // A display-policy distinction only; never used to authorize a Provider or bill.
 const examUnit=!!exam&&/인문|언어|사회|경제|경영/.test(exam.field_or_division??'');
 // A sole question is auto-selected: drop the redundant "select all" and multi-question copy.
 const single=!!exam&&exam.questions.length===1;
 function chooseQuestion(id:string){setQuestionId(id);if(id)setVisited(old=>old.includes(id)?old:[...old,id]);}
 if(sourceExams(sourceId).length&&(!universityId||(authStatus==='anonymous'||authStatus==='unconfigured')||status==='error'||(status==='ready'&&!rows.length)))return <SourceExamSelection sourceId={sourceId}/>;
 return <section className="university-section essay-start" aria-label="논술 첨삭 시작">
  <div className="discovery-topline"><h2>논술 첨삭 시작</h2><Link href="/my/essays/">나의 첨삭 기록 →</Link></div>
  {!universityId?<p className="university-empty">기출문제를 준비하고 있어요.</p>:authStatus==='loading'?<p role="status">로그인을 확인하고 있습니다.</p>:!user||!client?<p><Link href={`/login/?next=${encodeURIComponent(`/essay-lab/universities/${sourceId}/`)}`}>로그인</Link>하면 이용 가능한 기출문항을 확인하고 답안을 이어 쓸 수 있습니다.</p>:status==='loading'?<p role="status">기출문항을 불러오고 있습니다.</p>:status==='error'?<p role="alert">기출문항을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.</p>:!rows.length?<p className="university-empty">기출문제를 준비하고 있어요.</p>:<>
   <div className="essay-selection-grid">
    <label>학년도<select value={year} onChange={e=>change(()=>{setYear(e.target.value);setCampus('');setTrack('');setExamId('');})}><option value="">학년도 선택</option>{years.map(y=><option key={y} value={y}>{y}학년도</option>)}</select></label>
    {campuses.length>1&&<label>캠퍼스<select value={campus} onChange={e=>change(()=>{setCampus(e.target.value);setTrack('');setExamId('');})}><option value="">캠퍼스 선택</option>{campuses.map(c=><option key={c} value={c}>{c==='__unspecified'?'캠퍼스 정보 미등록':c}</option>)}</select></label>}
    <label>계열<select disabled={!year} value={track} onChange={e=>change(()=>{setTrack(e.target.value);const matches=campusRows.filter(x=>(x.field_or_division??x.exam_name)===e.target.value);setExamId(matches.length===1?matches[0].id:'');})}><option value="">계열 선택</option>{tracks.map(t=><option key={t}>{t}</option>)}</select></label>
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
    {exam.questions.filter(q=>(visited.includes(q.id)||q.id===selectedQuestionId)).map(q=><div key={q.id} hidden={q.id!==selectedQuestionId}><EssayQuestionDraft questionId={q.id} onDirtyChange={onDirty} onSubmissionDraft={onSubmissionDraft}/></div>)}
    {question&&<div className="essay-submit-gate">
     {examUnit&&<p>선택한 문항 묶음의 최초 첨삭은 1 Credit이며, 14일 이내 같은 문항 집합의 재첨삭 1회가 포함됩니다. 최초 제출 후에는 새 문항을 추가할 수 없습니다.</p>}
     <DbExamSubmit key={exam.id} examId={exam.id} questionIds={questionIds} included={examUnit?selectedIds:[question.id]} drafts={drafts}/>
    </div>}
   </>}
  </>}
 </section>;
}
