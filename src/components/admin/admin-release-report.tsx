'use client';
import {useState} from 'react';
import {periodBounds,type AdminPeriod} from '@/lib/admin/period';
import type {ReportKind,ReleaseReport} from '@/lib/admin/release-report';
import {formatNumber,formatDateTime,creditOriginLabel,orderStateLabel,paymentModeLabel} from '@/lib/admin/format';
import {AdminPeriodFilter} from './admin-period-filter';
import {useAdminQuery,AdminLoading,AdminErrorPanel} from './admin-surface';

export function AdminReleaseReport({kind,onPaymentState}:{kind:ReportKind;onPaymentState?:(state:string)=>void}){
 const [period,setPeriod]=useState<AdminPeriod>('d30'),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const [category,setCategory]=useState('all'),[state,setState]=useState('all'),[quantity,setQuantity]=useState(''),[offset,setOffset]=useState(0);
 const bounds=periodBounds(period,from,to);
 const filters={kind,from:bounds&&Number.isFinite(bounds.from)?new Date(bounds.from).toISOString():null,to:bounds&&Number.isFinite(bounds.to)?new Date(bounds.to).toISOString():null,category,state,quantity:quantity?Number(quantity):null,offset,limit:25};
 const result=useAdminQuery<ReleaseReport>(bounds?client=>client.releaseReport(filters):null,JSON.stringify(filters));
 const data=result.state.status==='ready'?result.state.data:null;
 const metric=(label:string,value:number,unit='')=><div className="admin-metric" key={label}><p className="admin-metric__label">{label}</p><p className="admin-metric__value">{formatNumber(value)}{unit}</p></div>;
 return <section className={`admin-section ${kind==='dashboard'?'admin-section--primary':''}`}><h2>{kind==='dashboard'?'핵심 운영 지표':kind==='credit'?'크레딧 종류·기간 통계':'상품·기간별 주문 및 결제'}</h2>
  <AdminPeriodFilter period={period} from={from} to={to} onChange={(p,f,t)=>{setPeriod(p);setFrom(f);setTo(t);setOffset(0);}}/>
  {kind==='credit'&&<label>크레딧 종류 <select value={category} onChange={e=>{setCategory(e.target.value);setOffset(0);}}>{[['all','전체'],['purchase','구매'],['free','무료 지급'],['admin','관리자 지급'],['consume','사용'],['expiration','만료'],['reversal','환불·회수']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
  {kind==='payment'&&<div className="admin-search__filters"><label>상품 <select value={quantity} onChange={e=>{setQuantity(e.target.value);setOffset(0);}}><option value="">전체</option>{[1,3,5,10].map(n=><option key={n} value={n}>{n}회권</option>)}</select></label><label>거래 상태 <select value={state} onChange={e=>{setState(e.target.value);onPaymentState?.(e.target.value==='all'?'':e.target.value.toUpperCase());setOffset(0);}}><option value="all">전체</option><option value="paid">결제 완료</option><option value="cancelled">결제 취소</option></select></label></div>}
  {!bounds?<p role="status">시작일과 종료일을 선택해 주세요.</p>:result.state.status==='loading'?<AdminLoading/>:result.state.status==='error'?<AdminErrorPanel kind={result.state.kind} onRetry={result.reload}/>:data&&<>
   <p className="admin-muted">한국 날짜 기준 · {formatDateTime(data.as_of)} 조회</p>
   {kind==='dashboard'&&<><div className="admin-metrics">{metric('신규 회원',data.new_members!)}{metric('크레딧 지급',data.credit_granted!)}{metric('크레딧 사용',data.credit_used!)}{metric('첨삭 진행',data.essay!.pending)}{metric('첨삭 완료',data.essay!.completed)}{metric('첨삭 실패',data.essay!.failed)}</div><p className="admin-muted">첨삭은 선택 기간에 시작된 시험 회차의 현재 상태입니다. 서버 전체 장애 모니터링은 데이터 연결이 필요합니다.</p><div className="admin-metrics">{metric('학습시간',Math.round(data.study_seconds!/60),'분')}</div><p className="admin-muted">선택 기간에 시작하고 종료된 기록 중 학습시간 합산 대상만 포함합니다.</p></>}
   {kind!=='credit'&&<div className="admin-payment-summary"><h3>결제 완료 건수·금액</h3>{data.paid.length?data.paid.map(p=><p key={p.mode+p.currency}>{paymentModeLabel(p.mode)} · {formatNumber(p.count)}건 · {formatNumber(p.amount)} {p.currency}</p>):<p>결제 완료 0건 · 금액 0</p>}<p className="admin-muted">{kind==='dashboard'?'결제일':'주문 생성일'} 기준. 취소·부분 취소는 완료 금액에서 제외하며 순매출을 추정하지 않습니다. TEST 금액은 실제 매출이 아닙니다.</p></div>}
   {kind==='credit'&&<><div className="admin-metrics">{metric('거래 건수',data.total!)}{metric('잔액 증감',data.balance_delta!)}{metric('예약 증감',data.reserved_delta!)}</div><p className="admin-muted">실제 Ledger 거래 발생일 기준. 전체에는 예약·예약 해제도 포함합니다. 환불·회수는 환불과 조정 기록이며 양수·음수 증감을 그대로 표시합니다.</p></>}
   {kind==='dashboard'?<><h3>등록 자료 현황</h3><div className="admin-metrics">{metric('등록 대학',data.registry!.universities)}{metric('등록 시험',data.registry!.exams)}{metric('게시 플래그 문항',data.registry!.published_questions)}</div><p className="admin-muted">게시 플래그(is_published) 기준이며 실제 첨삭 가능 문항 수가 아닙니다. 실제 서비스 공개 상태는 아래 별도 조회를 확인하세요.</p></>:<><p>전체 {formatNumber(data.total!)}건</p><ul className="admin-orders">{data.rows.map(row=><li className="admin-order" key={row.id}><p>{formatDateTime(row.created_at)}</p>{kind==='credit'?<p>{creditOriginLabel(row.origin??'')} · {row.transaction_type} · 잔액 {row.balance_delta!>0?'+':''}{row.balance_delta} · 예약 {row.reserved_delta}</p>:<><p>{row.sku} · {row.quantity}회권 · {orderStateLabel(row.state??'').label}</p><p>{paymentModeLabel(row.mode??'')} · {formatNumber(row.amount!)} {row.currency}</p><p>결제일 {formatDateTime(row.paid_at??null)}</p></>}</li>)}</ul>{data.total===0&&<p>조건에 맞는 기록이 없습니다.</p>}<nav className="admin-pager" aria-label="통계 목록 페이지"><button type="button" className="button button--outline button--small" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}>이전</button><span>{Math.floor(offset/25)+1}페이지</span><button type="button" className="button button--outline button--small" disabled={offset+25>=data.total!} onClick={()=>setOffset(offset+25)}>다음</button></nav></>}
  </>}
 </section>;
}
