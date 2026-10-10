'use client';
import Link from 'next/link';
import './essay-service.css';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-context';
import {filterExams,loadExams,loadQuestions,officialUrl,type Exam,type Question} from '@/lib/essay-runtime/catalog';
export function EssayServiceCatalog(){
 const {client,user}=useAuth();const [exams,setExams]=useState<Exam[]>([]),[query,setQuery]=useState(''),[year,setYear]=useState(''),[campus,setCampus]=useState(''),[status,setStatus]=useState('loading');
 useEffect(()=>{let active=true;if(!client){queueMicrotask(()=>{if(active)setStatus('unconfigured');});return()=>{active=false;};}void loadExams(client).then(rows=>{if(active){setExams(rows);setStatus('ready');}}).catch(()=>{if(active)setStatus('error');});return()=>{active=false;};},[client,user?.id]);
 const rows=filterExams(exams,query,year,campus);
 return <section aria-label="실제 기출문제" className="page-section essay-service">
  <h2>기출문제 풀기</h2><p>실제 시험 학년도를 기준으로 찾습니다.</p><p><Link href="/my/essays/">나의 첨삭 기록</Link></p>
  <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}>
   <label>대학·유형·전형 검색<input value={query} onChange={e=>setQuery(e.target.value)} type="search" style={{maxWidth:'100%'}}/></label>
   <label>시험 학년도<select value={year} onChange={e=>setYear(e.target.value)}><option value="">전체</option>{[...new Set(exams.map(e=>e.admission_year))].map(y=><option key={y}>{y}</option>)}</select></label>
   <label>캠퍼스<select value={campus} onChange={e=>setCampus(e.target.value)}><option value="">전체</option>{[...new Set(exams.flatMap(e=>e.campus?[e.campus]:[]))].map(c=><option key={c}>{c}</option>)}</select></label>
  </div>
  {status==='loading'&&<p role="status">기출문제를 불러오고 있습니다.</p>}
  {status==='error'&&<p role="alert">기출문제를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p>}
  {status==='unconfigured'&&<p>기출문제에 연결할 수 없습니다.</p>}
  {status==='ready'&&!rows.length&&<p>검색 조건에 맞는 기출문제가 없습니다.</p>}
  {status==='ready'&&rows.map(exam=><ExamQuestions key={`${user?.id??'guest'}:${exam.id}`} exam={exam}/>)}
 </section>;
}
function ExamQuestions({exam}:{exam:Exam}){
 const {client}=useAuth();const [questions,setQuestions]=useState<Question[]|null>(null),[open,setOpen]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;if(open&&client)void loadQuestions(client,exam.id).then(q=>{if(active)setQuestions(q);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[open,client,exam.id]);
 const url=officialUrl(exam.official_source_url);
 return <article className="catalog-card" style={{marginTop:'1rem',overflowWrap:'anywhere'}}>
  <h3>{exam.universities.name} · {exam.admission_year}학년도</h3><p>{exam.exam_name}{exam.campus?` · ${exam.campus}`:''}</p>
  {url&&<p><a href={url} target="_blank" rel="noopener noreferrer">출처 · {exam.universities.name} 입학처 ↗</a></p>}
  <button className="button button--outline button--small" onClick={()=>setOpen(!open)} aria-expanded={open}>문항 {open?'접기':'보기'}</button>
  {open&&(failed?<p role="alert">문항을 불러오지 못했습니다.</p>:questions===null?<p role="status">문항 확인 중</p>:questions.length?questions.map(q=><p key={q.id}><Link href={`/essay-lab/write/?question=${q.id}`}>{q.label} · 답안 작성</Link></p>):<p>등록된 연습 문항이 없습니다. 입학처 원문을 확인해 주세요.</p>)}
 </article>;
}
