'use client';
import Link from 'next/link';
import {EssayGrowth} from './essay-history-growth';
import {useEffect,useCallback,useState} from 'react';
import {OwnerArea,useOwnerData,DataStatus,dateLabel} from './owner-data';
import {ReturnNavigation} from './return-navigation';
import {RecordDetail} from './essay-dashboard';
import {readEssayDashboard,readMathDashboard,summarizeRecords,historyGroups,historyType,completedAt,type RecordItem} from '@/lib/my/essay-dashboard';
import {useCreditSummary} from '@/components/credit-balance';
import './essay-dashboard.css';
const statusLabels:Record<string,string>={completed:'완료',pending:'대기',requested:'대기',queued:'대기',processing:'평가 중',failed:'실패',cancelled:'취소',reconciling:'처리 확인 중'};
export function recordStatus(row:RecordItem){return [...row.evaluations].filter(e=>e.valid).sort((a,b)=>b.at.localeCompare(a.at)).at(0)?.status.toLowerCase()??'none';}
export function EssayHistory(){return <div className="my-dashboard essay-personal content-wrap content-wrap--detail"><header className="my-head"><h1>나의 첨삭 기록</h1></header><OwnerArea path="/my/essays/"><HistoryContent/></OwnerArea></div>;}
function HistoryContent(){
 const essay=useOwnerData(readEssayDashboard,true),math=useOwnerData(readMathDashboard,true);const credit=useCreditSummary();
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
 const returnToHistory=()=>{setSelected(null);refresh();};
 const [byExam,setByExam]=useState(true);
 const [selected,setSelected]=useState<RecordItem|null>(null),[university,setUniversity]=useState(''),[year,setYear]=useState(''),[type,setType]=useState(''),[status,setStatus]=useState('');
 const rows=[...(essay.data??[]),...(math.data??[])].sort((a,b)=>b.at.localeCompare(a.at));const summary=summarizeRecords(rows),ready=!!essay.data&&!!math.data;
 const shown=rows.filter(r=>(!university||r.university===university)&&(!year||String(r.year)===year)&&(!type||r.essayType===type)&&(!status||recordStatus(r)===status));
 if(selected)return <><div className="my-actions"><button className="button button--outline" onClick={returnToHistory}>뒤로가기</button><button className="button button--outline" onClick={returnToHistory}>나의 첨삭 기록</button></div><RecordDetail row={selected}/></>;
 return <><ReturnNavigation/><section className="my-section"><h2>나의 논술 성장</h2><p className="my-note">조회된 시험 첨삭 기록과 최근 논술 연습 50개·수리 답안 50개 기준입니다. 시험 정보가 없는 과거 답안은 시험·회차 수에 포함하지 않습니다.</p><div className="my-metrics">{[['첨삭한 시험·회차',new Set(rows.filter(r=>r.source==='exam'&&recordStatus(r)==='completed').map(r=>r.examId)).size],['재작성한 답안',summary.rewritten],['재첨삭 완료',summary.reevaluated]].map(([name,n])=><article className="my-metric" key={name}><h3>{name}</h3><p className="my-metric__value">{ready?n:'—'}</p></article>)}</div><p className="my-note">재작성은 답안을 다시 제출한 기록, 재첨삭은 그 답안의 평가가 완료된 기록입니다.</p>{credit.state.status==='ready'&&<p>남은 첨삭권 {credit.state.value.spendable}개 · <Link href="/account/credits/">구매/사용내역</Link></p>}</section>
 <EssayGrowth/>
 {!essay.data&&<DataStatus error={essay.error} reload={essay.reload}/>} {!math.data&&<DataStatus error={math.error} reload={math.reload}/>}
 {rows.length>0&&<details open className="report-controls"><summary>검색</summary><div className="history-filters"><label>대학<select aria-label="대학" value={university} onChange={e=>setUniversity(e.target.value)}><option value="">전체 대학</option>{[...new Set(rows.flatMap(r=>r.university?[r.university]:[]))].map(v=><option key={v}>{v}</option>)}</select></label><label>학년도<select aria-label="학년도" value={year} onChange={e=>setYear(e.target.value)}><option value="">전체 학년도</option>{[...new Set(rows.flatMap(r=>r.year?[r.year]:[]))].sort((a,b)=>b-a).map(v=><option key={v}>{v}</option>)}</select></label><label>논술 유형<select aria-label="논술 유형" value={type} onChange={e=>setType(e.target.value)}><option value="">전체 유형</option>{['인문','경제·경영','수리','과학'].map(v=><option key={v}>{v}</option>)}</select></label><label>평가 상태<select aria-label="평가 상태" value={status} onChange={e=>setStatus(e.target.value)}><option value="">전체 상태</option><option value="none">평가 요청 전</option>{Object.entries(statusLabels).map(([v,label])=><option value={v} key={v}>{label}</option>)}</select></label></div><p className="my-note">대학·학년도·유형이 제공되지 않은 기록은 전체 목록에서 확인할 수 있습니다.</p></details>}
 {ready&&!rows.length&&<div className="my-panel"><p>아직 첨삭 기록이 없습니다.</p><p>첫 답안을 작성하고 나의 논술 기록을 시작해보세요.</p><Link href="/essay-lab/">논술 LAB 시작하기</Link></div>}{rows.length>0&&!shown.length&&<p>선택한 조건의 첨삭 기록이 없습니다.</p>}
 <div className="my-actions" role="group" aria-label="기록 정렬"><button aria-pressed={!byExam} onClick={()=>setByExam(false)}>최신순</button><button aria-pressed={byExam} onClick={()=>setByExam(true)}>시험별</button></div>
 <div className="my-essay-records">{historyGroups(shown,byExam).map(group=><section className="essay-history-group" key={`${group[0].source}:${group[0].id}`}>{group.map(row=><button type="button" className="my-panel essay-history-card" key={`${row.source}:${row.id}`} onClick={()=>setSelected(row)}><strong>{row.university??'대학 정보 미제공'}</strong><span>{row.question}</span><span className={`essay-history-badge ${row.source==='exam'&&row.parentId?'included':''}`}>{historyType(row)}</span><small>{dateLabel(completedAt(row))} · {statusLabels[recordStatus(row)]??'상태 확인 필요'}</small><span>결과 보기 →</span></button>)}</section>)}</div></>;
}
