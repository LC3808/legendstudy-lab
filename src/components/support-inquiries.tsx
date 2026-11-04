'use client';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './auth-context';
import type {SupabaseClient} from '@supabase/supabase-js';
import {inquiryStatusLabel,formatDateTime} from '@/lib/admin/format';
type Item={source:string;inquiry_id:string;title:string;status:string;created_at:string;answered:boolean};
type Detail={title:string;body:string;replies:{reply_id:string;body:string;created_at:string}[]};
export function SupportInquiries(){
 const {client,user,status}=useAuth();
 if(status!=='authenticated'||!client||!user) return <section><h2>내 문의·답변</h2><p>로그인 후 문의를 접수하고 답변을 확인할 수 있습니다.</p></section>;
 return <MemberSupport key={user.id} client={client}/>;
}
function MemberSupport({client}:{client:SupabaseClient}){
 const [items,setItems]=useState<Item[]>([]),[offset,setOffset]=useState(0),[reload,setReload]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [title,setTitle]=useState(''),[body,setBody]=useState(''),[category,setCategory]=useState('other'),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [selected,setSelected]=useState<Item|null>(null);
 const pending=useRef<{payload:string;key:string}|null>(null),inFlight=useRef(false);
 useEffect(()=>{let active=true;client.rpc('support_mine',{p:{dto_version:'inquiry-v1',offset,limit:20}}).then(({data,error})=>{if(!active)return;setLoading(false);if(error)setError('문의 내역을 불러오지 못했습니다.');else{setItems(data.items);setError('');}});return()=>{active=false;};},[client,offset,reload]);
 async function submit(e:React.FormEvent){e.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setNotice('');const payload=JSON.stringify([category,title.trim(),body.trim()]);if(pending.current?.payload!==payload)pending.current={payload,key:crypto.randomUUID()};try{const {error}=await client.rpc('inquiry_submit',{p:{dto_version:'inquiry-v1',category,title:title.trim(),body:body.trim(),request_key:pending.current.key}});if(error)throw error;pending.current=null;setTitle('');setBody('');setOffset(0);setReload(x=>x+1);setNotice('문의가 접수되었습니다.');}catch{setNotice('접수 결과를 확인하지 못했습니다. 다시 시도해 주세요.');}finally{inFlight.current=false;setBusy(false);}}
 return <section className="policy-section"><h2>내 문의·답변</h2><button type="button" onClick={()=>{setLoading(true);setReload(x=>x+1);}}>새로고침</button>{loading?<p>불러오는 중…</p>:error?<p role="alert">{error}</p>:<><ul>{items.map(i=><li key={`${i.source}:${i.inquiry_id}`}><button type="button" onClick={()=>setSelected(i)}>{i.title} · {i.source} · {inquiryStatusLabel(i.status).label} · {i.answered?'답변 있음':'답변 대기'} · {formatDateTime(i.created_at)}</button></li>)}</ul>{!items.length&&<p>접수한 문의가 없습니다.</p>}<button disabled={!offset} onClick={()=>{setLoading(true);setOffset(x=>Math.max(0,x-20));}}>이전</button><button disabled={items.length<20} onClick={()=>{setLoading(true);setOffset(x=>x+20);}}>다음</button></>}
 {selected&&<MemberDetail key={`${selected.source}:${selected.inquiry_id}`} item={selected} client={client}/>}
 <h3>1:1 문의 접수</h3><form onSubmit={submit}><label>문의 유형<select value={category} onChange={e=>setCategory(e.target.value)}><option value="other">기타</option><option value="material">학습자료</option><option value="technical">오류 신고</option><option value="account">계정</option></select></label><label>제목<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>내용<textarea required maxLength={4000} value={body} onChange={e=>setBody(e.target.value)}/></label><button disabled={busy} type="submit">{busy?'접수 중…':'문의 접수'}</button><p role="status">{notice}</p></form></section>;
}
function MemberDetail({client,item}:{client:SupabaseClient;item:Item}){
 const [detail,setDetail]=useState<Detail|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;client.rpc('support_detail',{p:{dto_version:'inquiry-v1',source:item.source,id:item.inquiry_id}}).then(({data,error})=>{if(active){setFailed(!!error);if(!error)setDetail(data);}});return()=>{active=false;};},[client,item,retry]);
 if(failed)return <button onClick={()=>setRetry(x=>x+1)}>답변을 불러오지 못했습니다. 다시 시도</button>;
 if(!detail)return <p>답변 불러오는 중…</p>;
 return <article><h3>{detail.title}</h3><p className="admin-prose">{detail.body}</p><h4>관리자 답변</h4>{detail.replies.length?detail.replies.map(r=><div key={r.reply_id}><p>{formatDateTime(r.created_at)}</p><p className="admin-prose">{r.body}</p></div>):<p>아직 답변이 없습니다.</p>}</article>;
}
