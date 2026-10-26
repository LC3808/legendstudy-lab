'use client';
import Link from 'next/link';
import {UniversityLogo} from '../university-identity';
import {publicCatalog} from '@/lib/essay-runtime/public-discovery';
import {useSearchParams} from 'next/navigation';
import {GrowthShare} from './growth-share';
import {RecordDetail} from './essay-dashboard';
import {useEffect,useCallback,useState} from 'react';
import {OwnerArea,useOwnerData,DataStatus,dateLabel} from './owner-data';
import {ReturnNavigation} from './return-navigation';
import {essayResultHref} from '@/lib/my/essay-result-route';
import {readEssayDashboard,readMathDashboard,historyGroups,historyType,completedAt,type RecordItem} from '@/lib/my/essay-dashboard';

import './essay-dashboard.css';
const statusLabels:Record<string,string>={completed:'완료',pending:'대기',requested:'대기',queued:'대기',processing:'평가 중',failed:'실패',cancelled:'취소',reconciling:'처리 확인 중'};
export function recordStatus(row:RecordItem){return [...row.evaluations].filter(e=>e.valid).sort((a,b)=>b.at.localeCompare(a.at)).at(0)?.status.toLowerCase()??'none';}
export function EssayHistory({initialSource,initialId}:{initialSource?:string;initialId?:string}={}){return <div className="my-dashboard essay-personal content-wrap content-wrap--detail"><header className="my-head"><h1>나의 첨삭 기록</h1></header><OwnerArea path={initialId&&['exam','essay','math'].includes(initialSource??'')?essayResultHref(initialSource as RecordItem['source'],initialId):'/my/essays/'}><HistoryContent initialSource={initialSource} initialId={initialId}/></OwnerArea></div>;}
function HistoryContent({initialSource,initialId}:{initialSource?:string;initialId?:string}){
 const [selected,setSelected]=useState<string|null>(initialId?`${initialSource}:${initialId}`:null);
 const [page,setPage]=useState(0),[listOpen,setListOpen]=useState(true);
 const examId=useSearchParams().get("exam");
 const essay=useOwnerData(readEssayDashboard,true),math=useOwnerData(readMathDashboard,true);
 const reloadEssay=essay.reload,reloadMath=math.reload;
 const refresh=useCallback(()=>{reloadEssay();reloadMath();},[reloadEssay,reloadMath]);
 useEffect(()=>{
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  const changed=(event:Event)=>{if((event as CustomEvent).detail?.owner===essay.owner)refresh();};
  window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  window.addEventListener('essay-history-changed',changed);
  const timer=setInterval(visible,30000);
  return()=>{clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);window.removeEventListener('essay-history-changed',changed);};
 },[refresh,essay.owner]);
 const [byExam,setByExam]=useState(false);
 const [university,setUniversity]=useState(''),[year,setYear]=useState(''),[type,setType]=useState(''),[status,setStatus]=useState('');
 const rows=[...(essay.data??[]),...(math.data??[])].filter(r=>!examId||r.examId===examId).sort((a,b)=>b.at.localeCompare(a.at));const ready=!!essay.data&&!!math.data;
 const active=rows.find(r=>`${r.source}:${r.id}`===selected);
 const shown=rows.filter(r=>(!university||r.university===university)&&(!year||String(r.year)===year)&&(!type||r.essayType===type)&&(!status||recordStatus(r)===status));
 const pages=Math.max(1,Math.ceil(shown.length/5));
 const currentPage=Math.min(page,pages-1);
 const pageRows=historyGroups(shown,byExam).flat().slice(currentPage*5,currentPage*5+5);
 return <><div className="history-top-actions"><ReturnNavigation/>{examId&&<p role="status">선택한 시험의 첨삭 기록만 표시합니다. <Link href="/my/essays/">전체 기록 보기</Link></p>}<nav className="my-actions report-controls"><Link className="button button--outline" href="/account/essay/">나의 논술 성장</Link><Link className="button button--primary" href="/essay-lab/">새 논술 풀기 →</Link></nav></div>
 {!essay.data&&<DataStatus error={essay.error} reload={essay.reload}/>} {!math.data&&<DataStatus error={math.error} reload={math.reload}/>}
 {rows.length>0&&<details open className="report-controls"><summary>검색</summary><div className="history-filters"><label>대학<select aria-label="대학" value={university} onChange={e=>setUniversity(e.target.value)}><option value="">전체 대학</option>{[...new Set(rows.flatMap(r=>r.university?[r.university]:[]))].map(v=><option key={v}>{v}</option>)}</select></label><label>학년도<select aria-label="학년도" value={year} onChange={e=>setYear(e.target.value)}><option value="">전체 학년도</option>{[...new Set(rows.flatMap(r=>r.year?[r.year]:[]))].sort((a,b)=>b-a).map(v=><option key={v}>{v}</option>)}</select></label><label>논술 유형<select aria-label="논술 유형" value={type} onChange={e=>setType(e.target.value)}><option value="">전체 유형</option>{[...new Set(rows.flatMap(r=>r.essayType?[r.essayType]:[]))].map(v=><option key={v}>{v}</option>)}</select></label><label>평가 상태<select aria-label="평가 상태" value={status} onChange={e=>setStatus(e.target.value)}><option value="">전체 상태</option><option value="none">평가 요청 전</option>{Object.entries(statusLabels).map(([v,label])=><option value={v} key={v}>{label}</option>)}</select></label></div><p className="my-note">대학·학년도·유형이 제공되지 않은 기록은 전체 목록에서 확인할 수 있습니다.</p></details>}
 {ready&&!rows.length&&<div className="my-panel"><p>아직 첨삭 기록이 없습니다.</p><p>첫 답안을 작성하고 나의 논술 기록을 시작해보세요.</p><Link href="/essay-lab/">논술 LAB 시작하기</Link></div>}{rows.length>0&&!shown.length&&<p>선택한 조건의 첨삭 기록이 없습니다.</p>}
 <div className="my-actions report-controls" role="group" aria-label="기록 정렬"><button aria-pressed={!byExam} onClick={()=>setByExam(false)}>최신순</button><button aria-pressed={byExam} onClick={()=>setByExam(true)}>시험별</button></div>
 <div className={`essay-history-workspace ${selected?'has-selection':''}`}>
 <section className="history-list-panel report-controls"><div className="my-actions"><strong>시험 목록 · {shown.length}건</strong><button aria-expanded={listOpen} onClick={()=>setListOpen(!listOpen)}>{listOpen?'시험 목록 접기':'시험 목록 펼치기'}</button></div>{listOpen&&<><div className="my-essay-records" aria-label="첨삭 기록 목록">{historyGroups(pageRows,byExam).map(group=><section className="essay-history-group" key={`${group[0].source}:${group[0].id}`}>{group.map(row=><Link aria-current={selected===`${row.source}:${row.id}`?'true':undefined} className="my-panel essay-history-card" key={`${row.source}:${row.id}`} href={essayResultHref(row.source,row.id)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();setSelected(`${row.source}:${row.id}`);window.history.replaceState(null,'',essayResultHref(row.source,row.id));}}><strong className="history-university"><HistoryLogo name={row.university}/>{row.university??'대학 정보 미제공'}</strong><span className="history-exam-name">{row.university?row.question.split(row.university).join('').trim():row.question}</span><small><span className="essay-history-badge">{historyType(row)}</span> {dateLabel(completedAt(row))} · {statusLabels[recordStatus(row)]??'상태 확인 필요'}</small><span className="essay-history-result-action">결과 보기 →</span></Link>)}</section>)}</div><nav className="my-actions" aria-label="시험 목록 페이지"><button disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>이전</button><span>{currentPage+1} / {pages}</span><button disabled={currentPage+1>=pages} onClick={()=>setPage(currentPage+1)}>다음</button></nav></>}</section>
 <section className="history-detail" aria-label="선택한 첨삭 결과" aria-live="polite">{selected?<><div className="history-result-toolbar report-controls"><Link className="button button--outline" href="/essay-lab/">다른 논술 풀기</Link><button className="button button--outline report-controls" onClick={()=>{setSelected(null);window.history.replaceState(null,'',examId?`/my/essays/?exam=${encodeURIComponent(examId)}`:'/my/essays/');}}>목록으로 돌아가기</button><div className="history-result-tools"><button className="button button--outline" onClick={()=>window.print()}>인쇄 / PDF 저장</button>{active&&<GrowthShare rows={[active]} selected={active}/>}</div></div>{active?<RecordDetail key={selected} row={active}/>:ready?<p>이 계정에서 해당 기록을 찾을 수 없습니다.</p>:<p>결과를 확인하고 있습니다.</p>}</>:<div className="history-empty"><h2>기록에서 이어지는 다음 도전</h2><p>위 시험 목록에서 기록을 선택해 첨삭 결과와 재작성 안내를 확인하세요.</p><p>기존 결과와 성장 기록은 그대로 보존됩니다.</p></div>}</section>
 </div></>;
}

function HistoryLogo({name}:{name:string|null}){const university=publicCatalog.universities.find(u=>u.name===name);return university?<UniversityLogo university={university}/>:null;}
