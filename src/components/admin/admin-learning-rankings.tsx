 'use client';
import {useEffect,useState} from 'react';
import {useAuth} from '@/components/auth-context';
type Page={version:string;page:number;total_count:number;total_pages:number;rows:{id:string;label:string;users:number;records:number;rank:number}[]};
export function AdminLearningRankings({kind,range}:{kind:string;range:{p_from:string;p_to:string}}){
 const {client,user}=useAuth();const [page,setPage]=useState(1);const [search,setSearch]=useState('');const [retry,setRetry]=useState(0);
 const key=JSON.stringify([user?.id,range,kind,page,search,retry]);
 const [result,setResult]=useState<{key:string;data?:Page;error?:boolean}>();
 useEffect(()=>{let active=true;if(!client||!user)return;void Promise.resolve(client.rpc('admin_learning_rankings_page',{...range,p_kind:kind,p_page:page,p_page_size:10,p_search:search})).then(({data,error})=>{if(error||data?.version!=='admin-learning-rankings-v1'||!Array.isArray(data.rows))throw Error('Invalid ranking');if(active)setResult({key,data});}).catch(()=>{if(active)setResult({key,error:true});});return()=>{active=false;};},[client,user,key,range,kind,page,search]);
 const current=result?.key===key?result:undefined;const d=current?.data;
 return <div><label>전체 결과 검색<input value={search} maxLength={200} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label>{!current?<p role="status">조회 중…</p>:current.error?<p role="alert">집계를 불러오지 못했습니다. <button onClick={()=>setRetry(v=>v+1)}>다시 시도</button></p>:d&&<><p>전체 {d.total_count}개 · {d.total_count?`${(page-1)*10+1}~${Math.min(page*10,d.total_count)}위`:'기록 없음'}</p><table><thead><tr><th>순위</th><th>대상</th><th>고유 학생 수</th><th>기록 수</th></tr></thead><tbody>{d.rows.map(r=><tr key={r.id}><td>{r.rank}</td><td>{r.label}</td><td>{r.users}</td><td>{r.records}</td></tr>)}</tbody></table><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page} / {Math.max(1,d.total_pages)}</span><button disabled={page>=d.total_pages} onClick={()=>setPage(p=>p+1)}>다음</button></>}</div>;
}
