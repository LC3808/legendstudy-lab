'use client';
import Link from 'next/link';
import {useState} from 'react';
import {OwnerArea,useOwnerData,DataStatus,dateLabel} from './owner-data';
import {ReturnNavigation} from './return-navigation';
import {RecordDetail} from './essay-dashboard';
import {readEssayDashboard,readMathDashboard,summarizeRecords,type RecordItem} from '@/lib/my/essay-dashboard';
import {useCreditSummary} from '@/components/credit-balance';
import './essay-dashboard.css';
const statusLabels:Record<string,string>={completed:'완료',pending:'대기',requested:'대기',queued:'대기',processing:'평가 중',failed:'실패',cancelled:'취소',reconciling:'처리 확인 중'};
export function recordStatus(row:RecordItem){return [...row.evaluations].filter(e=>e.valid).sort((a,b)=>b.at.localeCompare(a.at)).at(0)?.status.toLowerCase()??'none';}
export function EssayHistory(){return <div className="my-dashboard essay-personal content-wrap content-wrap--detail"><header className="my-head"><h1>나의 첨삭 기록</h1></header><OwnerArea path="/my/essays/"><HistoryContent/></OwnerArea></div>;}
function HistoryContent(){
 const essay=useOwnerData(readEssayDashboard),math=useOwnerData(readMathDashboard);const credit=useCreditSummary();
 const [selected,setSelected]=useState<RecordItem|null>(null),[university,setUniversity]=useState(''),[year,setYear]=useState(''),[type,setType]=useState(''),[status,setStatus]=useState('');
 const rows=[...(essay.data??[]),...(math.data??[])].sort((a,b)=>b.at.localeCompare(a.at));const summary=summarizeRecords(rows),ready=!!essay.data&&!!math.data;
 const shown=rows.filter(r=>(!university||r.university===university)&&(!year||String(r.year)===year)&&(!type||r.essayType===type)&&(!status||recordStatus(r)===status));
 if(selected)return <><div className="my-actions"><button className="button button--outline" onClick={()=>setSelected(null)}>뒤로가기</button><button className="button button--outline" onClick={()=>setSelected(null)}>나의 첨삭 기록</button></div><h2>{selected.question}</h2><RecordDetail row={selected}/></>;
 return <><ReturnNavigation/><section className="my-section"><h2>첨삭 이용 현황</h2><p className="my-note">최근 논술 연습 50개와 수리 답안 50개 범위입니다. 전체 누적 통계가 아닙니다.</p><div className="my-metrics">{[['첨삭한 답안',summary.evaluated],['재작성한 답안',summary.rewritten],['재첨삭 완료',summary.reevaluated]].map(([name,n])=><article className="my-metric" key={name}><h3>{name}</h3><p className="my-metric__value">{ready?n:'—'}</p></article>)}</div><p className="my-note">재작성은 답안을 다시 제출한 기록, 재첨삭은 그 답안의 평가가 완료된 기록입니다.</p>{credit.state.status==='ready'&&<p>남은 첨삭권 {credit.state.value.spendable}개 · <Link href="/account/credits/">구매/사용내역</Link></p>}</section>
 {!essay.data&&<DataStatus error={essay.error} reload={essay.reload}/>} {!math.data&&<DataStatus error={math.error} reload={math.reload}/>}
 {rows.length>0&&<details className="report-controls"><summary>기록 필터</summary><div className="history-filters"><label>대학<select aria-label="대학" value={university} onChange={e=>setUniversity(e.target.value)}><option value="">전체 대학</option>{[...new Set(rows.flatMap(r=>r.university?[r.university]:[]))].map(v=><option key={v}>{v}</option>)}</select></label><label>학년도<select aria-label="학년도" value={year} onChange={e=>setYear(e.target.value)}><option value="">전체 학년도</option>{[...new Set(rows.flatMap(r=>r.year?[r.year]:[]))].sort((a,b)=>b-a).map(v=><option key={v}>{v}</option>)}</select></label><label>논술 유형<select aria-label="논술 유형" value={type} onChange={e=>setType(e.target.value)}><option value="">전체 유형</option>{['인문','경제·경영','수리','과학'].map(v=><option key={v}>{v}</option>)}</select></label><label>평가 상태<select aria-label="평가 상태" value={status} onChange={e=>setStatus(e.target.value)}><option value="">전체 상태</option><option value="none">평가 요청 전</option>{Object.entries(statusLabels).map(([v,label])=><option value={v} key={v}>{label}</option>)}</select></label><button className="button button--outline" onClick={()=>{setUniversity('');setYear('');setType('');setStatus('');}}>필터 초기화</button></div><p className="my-note">대학·학년도·유형이 제공되지 않은 기록은 전체 목록에서 확인할 수 있습니다.</p></details>}
 {ready&&!rows.length&&<div className="my-panel"><p>아직 첨삭 기록이 없습니다.</p><p>첫 답안을 작성하고 나의 논술 기록을 시작해보세요.</p><Link href="/essay-lab/">논술 LAB 시작하기</Link></div>}{rows.length>0&&!shown.length&&<p>선택한 조건의 첨삭 기록이 없습니다.</p>}
 <div className="my-essay-records">{shown.map(row=><article className="my-panel" key={`${row.source}:${row.id}`}><h2>{row.university??'대학 정보 미제공'} · {row.question}</h2><p>{row.year?`${row.year}학년도 · `:''}{row.essayType??'유형 미제공'} · {dateLabel(row.at)} 제출</p><p>{row.rewrite?'재작성 답안':'최초 답안'} · {statusLabels[recordStatus(row)]??(recordStatus(row)==='none'?'평가 요청 전':'상태 확인 필요')}</p><button className="button button--outline" onClick={()=>setSelected(row)}>답안·평가 보기</button></article>)}</div></>;
}
