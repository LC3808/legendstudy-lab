'use client';
import {useState} from 'react';
import {publicCatalog} from '@/lib/essay-runtime/public-discovery';
import {priorityUniversityIds} from '@/lib/essay-runtime/catalog-policy';
import type {ExamRow} from '@/lib/materials/contract';

const completedStates = new Set(['VERIFIED','PACKAGE_READY','E2E_PASSED','ACTIVE']);
const stateLabels:Record<string,string> = {UNANALYZED:'미검수',ANALYZED:'분석 완료',NEEDS_REVIEW:'추가 검토',IN_REVIEW:'검수 중',VERIFIED:'검수 완료',PACKAGE_READY:'Package 준비',E2E_PASSED:'평가 검증 완료',ACTIVE:'평가 제공',BLOCKED:'차단'};
function priority(id:string){
 const source=publicCatalog.universities.find(u=>u.universityId===id)?.sourceUniversityId;
 const index=(priorityUniversityIds as readonly string[]).indexOf(source??'');
 return index<0?999:index;
}
const kindLabel=(kind:string)=>kind==='admission'?'수시 논술':kind==='mock'?'모의논술':kind;
function trackSession(row:ExamRow){
 // Registry title already preserves the original track/session; do not invent a session.
 const parts=row.title.split(' · ');
 return parts.length>=4?parts.slice(3).join(' · '):row.track||row.title;
}
export function MaterialExamList({rows,university,onUniversity,onSelect}:{rows:ExamRow[];university:string;onUniversity:(id:string)=>void;onSelect:(id:string)=>void}){
 const [query,setQuery]=useState(''),[state,setState]=useState(''),[year,setYear]=useState(''),[kind,setKind]=useState(''),[track,setTrack]=useState('');
 const groups=Array.from(new Set(rows.map(r=>r.universityId))).map(id=>{
  const exams=rows.filter(r=>r.universityId===id);
  return {id,name:exams[0].university,total:exams.length,done:exams.filter(r=>completedStates.has(r.state)).length};
 }).sort((a,b)=>priority(a.id)-priority(b.id)||a.name.localeCompare(b.name,'ko'));
 const scope=rows.filter(r=>!university||r.universityId===university);
 const filtered=scope.filter(r=>(!query.trim()||`${r.university} ${r.title} ${r.year} ${r.track??''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))&&(!state||r.state===state)&&(!year||String(r.year)===year)&&(!kind||r.kind===kind)&&(!track||r.track===track)).sort((a,b)=>b.year-a.year||priority(a.universityId)-priority(b.universityId)||a.title.localeCompare(b.title,'ko')||a.examId.localeCompare(b.examId));
 const done=scope.filter(r=>completedStates.has(r.state)).length;
 const selected=groups.find(g=>g.id===university);
 function reset(){setQuery('');setState('');setYear('');setKind('');setTrack('');}
 const status=(r:ExamRow)=><><span className={`material-state${completedStates.has(r.state)?' is-complete':''}`}>{stateLabels[r.state]??r.state}</span>{r.approvalRequested&&<small>Package 승인 대기</small>}</>;
 return <>
  <nav className="material-university-tabs" aria-label="대학별 검수 목록">
   {[{id:'',name:'전체',done:rows.filter(r=>completedStates.has(r.state)).length,total:rows.length},...groups].map(g=><button key={g.id} type="button" aria-label={`${g.name} ${g.done}/${g.total}`} aria-pressed={university===g.id} onClick={()=>onUniversity(g.id)}><strong>{g.name}</strong><span>{g.done}/{g.total}</span></button>)}
  </nav>
  <section aria-label="시험 목록">
   <div className="material-list-heading"><div><h2>{selected?.name??'전체 대학'}</h2><p>검수 완료 {done}/{scope.length} · 문항 {scope.reduce((n,r)=>n+r.questionCount,0)}개</p></div><progress aria-label="검수 진행률" value={done} max={scope.length||1}/></div>
   <div className="material-toolbar">
    <label className="material-search">대학·계열·회차 검색<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="시험명, 학년도, 계열 검색"/></label>
    <label>학년도<select value={year} onChange={e=>setYear(e.target.value)}><option value="">전체</option>{Array.from(new Set(rows.map(r=>r.year))).sort((a,b)=>b-a).map(y=><option key={y}>{y}</option>)}</select></label>
    <label>시험 유형<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">전체</option>{Array.from(new Set(rows.map(r=>r.kind))).map(k=><option key={k} value={k}>{kindLabel(k)}</option>)}</select></label>
    <label>계열<select value={track} onChange={e=>setTrack(e.target.value)}><option value="">전체</option>{Array.from(new Set(rows.map(r=>r.track).filter(Boolean))).map(t=><option key={t!}>{t}</option>)}</select></label>
    <label>검수 상태<select value={state} onChange={e=>setState(e.target.value)}><option value="">전체</option>{Array.from(new Set(rows.map(r=>r.state))).map(s=><option key={s} value={s}>{stateLabels[s]??s}</option>)}</select></label>
    <button type="button" onClick={reset}>필터 초기화</button>
   </div>
   <p className="material-list-count" role="status">{filtered.length}개 시험 · 학년도 최신순</p>
   {filtered.length===0?<p className="material-empty">조건에 맞는 시험이 없습니다. 검색·필터를 확인해 주세요.</p>:<>
    <table className="material-exam-table"><caption className="material-sr-only">{selected?.name??'전체 대학'} 시험 검수 목록</caption><thead><tr>{!university&&<th scope="col">대학</th>}<th scope="col" aria-sort="descending">학년도 ↓</th><th scope="col">시험 유형</th><th scope="col">계열·회차</th><th scope="col">문항 수</th><th scope="col">검수 상태</th><th scope="col">작업</th></tr></thead><tbody>{filtered.map(r=><tr key={r.examId}>{!university&&<th scope="row">{r.university}</th>}<td>{r.year}</td><td>{kindLabel(r.kind)}</td><td>{trackSession(r)}</td><td>{r.questionCount}</td><td>{status(r)}</td><td><button className="material-review-action" onClick={()=>onSelect(r.examId)} aria-label={`${r.title} 검수하기`}>검수하기</button></td></tr>)}</tbody></table>
    <ul className="material-exam-mobile">{filtered.map(r=><li key={r.examId}><div>{!university&&<strong>{r.university}</strong>}<p>{r.year}학년도 · {kindLabel(r.kind)}</p><p>{trackSession(r)}</p><p>{r.questionCount}문항</p>{status(r)}</div><button className="material-review-action" onClick={()=>onSelect(r.examId)} aria-label={`${r.title} 검수하기`}>검수하기</button></li>)}</ul>
   </>}
  </section>
 </>;
}
