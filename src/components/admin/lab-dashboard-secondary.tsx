'use client';
import {useState} from 'react';
import Link from 'next/link';
import {FocusSection,useReadReport} from './admin-dashboard-view';
import {DashboardResult,type DashboardRead} from './admin-lab-dashboard';
import {KpiTile} from './kpi-tile';
import type {ReleaseReport} from '@/lib/admin/release-report';
import type {OperationsReport} from '@/lib/admin/monitoring';
import {dashboardNumber as number} from '@/lib/admin/lab-dashboard';
import {formatDateTime} from '@/lib/admin/format';
type Range={p_from:string|null;p_to:string|null};
type Quality={coverage:{subjects:number;reviewed:number};rows:{run_id:string;question_id:string;official_label:string|null;reviewed:boolean;created_at:string}[]};
export function LabDashboardQuality({range,refresh}:{range:Range;refresh:number}){
 const [retry,setRetry]=useState(0),[load,setLoad]=useState(false);
 const gate=useReadReport<boolean>('is_quality_operator',{},refresh+retry);
 const read=useReadReport<Quality>('ql_exam_cases',gate.data===true&&load&&range.p_from?{...range,p_offset:0,p_unreviewed:false}:null,refresh+retry);
 return <FocusSection title="첨삭 품질" href="/ql/"><p><Link href="/ql/">평가 품질 관리 · 검증 보고서 바로가기 →</Link></p><p className="focus-note">별도 quality_operators 권한 · 기간 내 요청의 문항 기준 · 출처 필터 미적용. 검수 대기 모집단이나 품질 통과율을 임의 계산하지 않습니다.</p>
 {gate.error?<p role="alert">품질 권한 확인 실패 <button onClick={()=>setRetry(n=>n+1)}>다시 시도</button></p>:gate.data===false?<p>품질 검수 접근 권한이 없습니다. 일반 관리자 권한과 별도입니다.</p>:gate.data!==true?<p role="status">품질 권한 확인 중…</p>:!range.p_from?<p>품질 집계는 전체 기간 조회를 지원하지 않습니다. 오늘·최근 7일·최근 30일을 선택하세요.</p>:!load?<button onClick={()=>setLoad(true)}>품질 검수 현황 불러오기</button>:<DashboardResult read={read} onRetry={()=>setRetry(n=>n+1)}>{q=><><div className="lab-secondary-grid"><KpiTile label="기간 내 요청 문항" value={number(q.coverage.subjects,'건')}/><KpiTile label="검토 기록 보유 문항" value={number(q.coverage.reviewed,'건')}/></div><h3>최근 요청 중 검토 이력 보유 사례</h3><p className="focus-note">최근 요청 50문항 내에서 최대 5건 표시 · 검수일순 전체 목록이 아닙니다.</p>{q.rows.filter(r=>r.reviewed).slice(0,5).map(r=><p key={r.run_id+r.question_id}><Link href={`/ql/?run=${r.run_id}&question=${r.question_id}`}>{r.official_label??'공식 문항 확인 불가'} · 요청 {formatDateTime(r.created_at)}</Link></p>)}{!q.rows.some(r=>r.reviewed)&&<p>최근 요청 범위에 검토 이력 보유 사례가 없습니다.</p>}</>}</DashboardResult>}
 </FocusSection>;
}
export function LabDashboardFinance({range,ops,refresh,onOpsRetry}:{range:Range;ops:DashboardRead<OperationsReport>;refresh:number;onOpsRetry:()=>void}){
 const [retry,setRetry]=useState(0);
 const params={version:'admin-release-v1',from:range.p_from,to:range.p_to,category:'all',quantity:null,offset:0,limit:1};
 const ledger=useReadReport<ReleaseReport>('admin_release_report',{p:{...params,kind:'dashboard',state:'all'}},refresh+retry);
 const cancellations=useReadReport<ReleaseReport>('admin_release_report',{p:{...params,kind:'payment',state:'cancelled'}},refresh+retry);
 return <FocusSection title="이용권·매출·비용" href="/admin/analytics/"><p className="focus-note">출처 필터 미적용. 공용 이용권 원장·WEB 결제 계약으로, 논술 LAB만의 매출·순이익으로 해석하지 않습니다.</p>
 <DashboardResult read={ledger} onRetry={()=>setRetry(n=>n+1)}>{d=><><div className="lab-secondary-grid"><KpiTile label="이용권 지급" value={number(d.credit_granted,'개')} href="/admin/credit/" note="선택 기간 지급 거래"/><KpiTile label="이용권 사용" value={number(d.credit_used,'개')} href="/admin/credit/" note="선택 기간 consume 거래 · 결제 매출과 별개"/></div><h3>유료 결제 · WEB 주문</h3><p className="focus-note">선택 기간 paid_at · 현재 PAID 상태 · mode/통화별 분리. 모바일 결제는 별도 결제 관리에서 확인합니다.</p>{d.paid.length?<ul>{d.paid.map(p=><li key={p.mode+p.currency}>{p.mode} · {p.currency} {number(p.amount)} · {number(p.count,'건')}</li>)}</ul>:<p>해당 범위 결제 완료 0건</p>}<Link href="/admin/payment/">결제 상세 →</Link></>}</DashboardResult>
 <h3>환불·취소</h3><DashboardResult read={cancellations} onRetry={()=>setRetry(n=>n+1)}>{c=><p>선택 기간에 생성된 주문 중 현재 취소·부분취소 {number(c.total,'건')}. 실제 환불 완료 금액·환불 시각 기준 집계는 이 계약에서 확인 불가입니다. <Link href="/admin/payment/">결제 기록 확인 →</Link></p>}</DashboardResult>
 <h3>AI 처리 비용</h3><p className="focus-note">선택 기간 접수 회차의 호출 영수증 · 모델/비용 근거별 소계. UNKNOWN·영수증 미기록은 0원이나 전체 청구액으로 해석하지 않습니다.</p>
 {!range.p_from?<p>AI 비용 RPC는 전체 기간 조회를 지원하지 않습니다. 기간을 선택하거나 <Link href="/admin/operations/">기존 비용 모니터링</Link>에서 확인하세요.</p>:<DashboardResult read={ops} onRetry={onOpsRetry}>{o=><>{o.costs.filter(c=>c.dimension==='model').length?<div className="admin-table-scroll"><table><thead><tr><th>모델</th><th>근거</th><th>USD 소계</th><th>호출 기록</th></tr></thead><tbody>{o.costs.filter(c=>c.dimension==='model').map((c,i)=><tr key={i}><td>{String(c.label??'확인 불가')}</td><td>{String(c.cost_status??'UNKNOWN')}</td><td>{c.cost_status==='UNKNOWN'?'확인 불가':number(c.usd)}</td><td>{number(c.calls)}</td></tr>)}</tbody></table></div>:<p>기록된 비용 영수증 없음 · 비용 확인 불가</p>}<p>비용 미상 영수증 {number(o.cost_coverage.unknown,'건')} · 영수증 자체가 없는 호출은 이 수에 포함되지 않습니다.</p><Link href="/admin/operations/">비용·이용권 운영 상세 →</Link></>}</DashboardResult>}
 </FocusSection>;
}
