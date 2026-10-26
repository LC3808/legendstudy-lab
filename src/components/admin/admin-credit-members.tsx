'use client';
import {useState} from 'react';
import type {CreditMembers,CreditMemberSort} from '@/lib/admin/credit-members';
import {formatDateTime} from '@/lib/admin/format';
import {AdminLoading,AdminErrorPanel,useAdminQuery} from './admin-surface';
import {AdminMemberDetailPanel} from './admin-members-view';
import {AdminCreditGrantForm} from './admin-credit-grant-form';
export function AdminCreditMembers({onGranted}:{onGranted:()=>void}) {
 const [input,setInput]=useState('');const [query,setQuery]=useState('');
 const [sort,setSort]=useState<CreditMemberSort>('balance_desc');const [limit,setLimit]=useState(10);const [offset,setOffset]=useState(0);
 const [selected,setSelected]=useState<string|null>(null);
 const {state,reload}=useAdminQuery<CreditMembers>(c=>c.creditMembers(query,sort,limit,offset),JSON.stringify([query,sort,limit,offset]));
 return <section className="admin-section admin-credit-directory">
  <h2>회원별 크레딧 관리</h2>
  <form className="admin-search" onSubmit={e=>{e.preventDefault();setQuery(input.trim());setOffset(0);setSelected(null);}}>
   <label htmlFor="credit-member-search">이메일 또는 회원 ID</label>
   <div className="admin-search__row"><input id="credit-member-search" className="admin-search__input" type="search" maxLength={254} value={input} onChange={e=>setInput(e.target.value)} placeholder="이메일 또는 회원 UUID"/><button className="button button--primary button--small" type="submit">검색</button></div>
  </form>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'12px 0'}}>
   <label>정렬 <select value={sort} onChange={e=>{setSort(e.target.value as CreditMemberSort);setOffset(0);setSelected(null);}}>
    <option value="balance_desc">사용 가능 높은 순</option><option value="balance_asc">사용 가능 낮은 순</option><option value="granted_desc">최근 지급순</option><option value="used_desc">최근 사용순</option><option value="joined_desc">최근 가입순</option>
   </select></label>
   <label>표시 <select value={limit} onChange={e=>{setLimit(Number(e.target.value));setOffset(0);setSelected(null);}}>{[10,20,50].map(n=><option key={n} value={n}>{n}명</option>)}</select></label>
  </div>
  {state.status==='loading'?<AdminLoading label="회원별 크레딧을 불러오는 중입니다"/>:state.status==='error'?<AdminErrorPanel kind={state.kind} onRetry={reload}/>:<>
   <p className="admin-muted">총 {state.data.total}명 · 최근 이용일은 크레딧 사용 확정일 기준입니다.</p>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['회원 이메일 / ID','사용 가능','예약','유료','무료','기타','최근 사용일','관리'].map(h=><th key={h} style={{padding:'10px 8px',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>
   {state.data.items.map(m=><tr key={m.account_id} style={{borderTop:'1px solid #e2e8f0'}}>
    <td style={{padding:8}}>{m.email??'이메일 없음'}<small style={{display:'block',color:'#64748b'}}>{m.account_id}</small></td>
    {(['spendable','reserved','paid','free','other'] as const).map(k=><td key={k} style={{padding:8}}>{m.summary[k]}</td>)}
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
