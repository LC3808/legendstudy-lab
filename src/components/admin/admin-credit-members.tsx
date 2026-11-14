'use client';
import {useState} from 'react';
import type {CreditMembers,CreditMemberSort} from '@/lib/admin/credit-members';
import {formatDateTime} from '@/lib/admin/format';
import {AdminLoading,AdminErrorPanel,useAdminQuery} from './admin-surface';
import {AdminMemberDetailPanel} from './admin-members-view';
import {AdminCreditGrantForm} from './admin-credit-grant-form';
export function AdminCreditMembers({onGranted}:{onGranted:()=>void}) {
 const [input,setInput]=useState('');const [query,setQuery]=useState('');
 const [sort,setSort]=useState<CreditMemberSort>('requested_desc');const [limit,setLimit]=useState(10);const [offset,setOffset]=useState(0);
 const [selected,setSelected]=useState<string|null>(null);
 const {state,reload}=useAdminQuery<CreditMembers>(c=>c.creditMembers(query,sort,limit,offset),JSON.stringify([query,sort,limit,offset]));
 return <section className="admin-section admin-credit-directory">
  <h2>회원별 이용권 관리</h2>
  <form className="admin-search" onSubmit={e=>{e.preventDefault();setQuery(input.trim());setOffset(0);setSelected(null);}}>
   <label htmlFor="credit-member-search">이메일 또는 회원 ID</label>
   <div className="admin-search__row"><input id="credit-member-search" className="admin-search__input" type="search" maxLength={254} value={input} onChange={e=>setInput(e.target.value)} placeholder="이메일 또는 회원 UUID"/><button className="button button--primary button--small" type="submit">검색</button></div>
  </form>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'12px 0'}}>
   <label>정렬 <select value={sort} onChange={e=>{setSort(e.target.value as CreditMemberSort);setOffset(0);setSelected(null);}}>
    <option value="requested_desc">최근 첨삭 요청순</option><option value="completed_desc">최근 첨삭 완료순</option><option value="balance_desc">이용권 잔액 높은 순</option><option value="balance_asc">이용권 잔액 낮은 순</option><option value="used_desc">최근 이용권 사용순</option><option value="joined_desc">최근 가입순</option>
   </select></label>
   <label>표시 <select value={limit} onChange={e=>{setLimit(Number(e.target.value));setOffset(0);setSelected(null);}}>{[10,20,50].map(n=><option key={n} value={n}>{n}명</option>)}</select></label>
  </div>
  {state.status==='loading'?<AdminLoading label="회원별 이용권을 불러오는 중입니다"/>:state.status==='error'?<AdminErrorPanel kind={state.kind} onRetry={reload}/>:<>
   <p className="admin-muted">총 {state.data.total}명 · 첨삭 요청·완료는 시험 회차 기준, 이용권 사용일은 원장 확정일 기준입니다.</p>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['회원 이메일 / ID','사용 가능','첨삭 요청 / 완료','최근 첨삭 요청일','최근 첨삭 대학','최근 이용권 사용일','관리'].map(h=><th key={h} style={{padding:'10px 8px',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>
   {state.data.items.map(m=><tr key={m.account_id} style={{borderTop:'1px solid #e2e8f0'}}>
    <td style={{padding:8}}>{m.email??'이메일 없음'}<small style={{display:'block',color:'#64748b'}}>{m.account_id}</small></td>
    <td style={{padding:8}}>{m.summary.spendable}<small style={{display:'block'}}>예약 {m.summary.reserved} · 유료 {m.summary.paid} · 무료 {m.summary.free} · 기타 {m.summary.other}</small></td><td>{m.activity?`${m.activity.requested} / ${m.activity.completed}`:'조회 연결 필요'}</td><td>{formatDateTime(m.activity?.last_requested_at??null)}</td><td>{m.activity?.latest_university??'—'}</td>
    <td style={{padding:8,whiteSpace:'nowrap'}}>{formatDateTime(m.last_used_at)}</td>
    <td style={{padding:8}}><button className="button button--outline button--small" onClick={()=>setSelected(selected===m.account_id?null:m.account_id)} aria-expanded={selected===m.account_id}>상세 보기</button><AdminCreditGrantForm accountId={m.account_id} email={m.email} onGranted={()=>{reload();onGranted();setSelected(null);}}/></td>
   </tr>)}
   </tbody></table></div>
   {state.data.items.length===0?<p>검색 결과가 없습니다.</p>:null}
   <div style={{display:'flex',alignItems:'center',gap:12,marginTop:12}}><button className="button button--outline button--small" disabled={offset===0} onClick={()=>{setOffset(Math.max(0,offset-limit));setSelected(null);}}>이전</button><span>{Math.floor(offset/limit)+1}페이지</span><button className="button button--outline button--small" disabled={offset+limit>=state.data.total} onClick={()=>{setOffset(offset+limit);setSelected(null);}}>다음</button></div>
  </>}
  {selected?<AdminMemberDetailPanel key={selected} accountId={selected}/>:null}
 </section>;
}
