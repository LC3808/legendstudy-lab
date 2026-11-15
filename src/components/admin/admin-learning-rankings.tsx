 'use client';
import {useEffect,useState} from 'react';
import './learning-analytics.css';
import {useAuth} from '@/components/auth-context';
type Page={version:string;page:number;total_count:number;total_pages:number;rows:{id:string;label:string;users:number;records:number;rank:number}[]};
export function AdminLearningRankings({kind,range}:{kind:string;range:{p_from:string;p_to:string}}){
 const {client,user}=useAuth();const [page,setPage]=useState(1);const [search,setSearch]=useState('');const [retry,setRetry]=useState(0);
 const key=JSON.stringify([user?.id,range,kind,page,search,retry]);
 const [result,setResult]=useState<{key:string;data?:Page;error?:boolean}>();
 useEffect(()=>{let active=true;if(!client||!user)return;void Promise.resolve(client.rpc('admin_learning_rankings_page',{...range,p_kind:kind,p_page:page,p_page_size:10,p_search:search})).then(({data,error})=>{if(error||data?.version!=='admin-learning-rankings-v1'||!Array.isArray(data.rows))throw Error('Invalid ranking');if(active)setResult({key,data});}).catch(()=>{if(active)setResult({key,error:true});});return()=>{active=false;};},[client,user,key,range,kind,page,search]);
 const current=result?.key===key?result:undefined;const d=current?.data;
 const material=kind==='saved'||kind==='recent';
 const max=Math.max(1,...(d?.rows.map(r=>r.users)??[]));
 const usersLabel=kind==='saved'?'저장 학생':kind==='recent'?'열람 학생':'고유 학생';
 const recordsLabel=kind==='recent'?'학생·자료 쌍':kind==='saved'?'저장 기록':'기록 수';
 return <div className="learning-ranking"><label className="learning-ranking__search">전체 결과 검색<input value={search} maxLength={200} placeholder={material?'자료명 검색':'대학명 검색'} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label>{!current?<p role="status">조회 중…</p>:current.error?<p role="alert">집계를 불러오지 못했습니다. <button onClick={()=>setRetry(v=>v+1)}>다시 시도</button></p>:d&&<>
 <p className="learning-section-note" aria-live="polite">{search?'검색 결과':'전체'} {d.total_count.toLocaleString()}개 · {d.total_count?`${(page-1)*10+1}~${Math.min(page*10,d.total_count)}위`:'기록 없음'}</p>
 {d.rows.length?<table><caption className="sr-only">{usersLabel} 순위 · 막대는 현재 페이지 내 상대 학생 수</caption><thead><tr><th scope="col" className="learning-ranking__rank">순위</th><th scope="col">{material?'시험·자료명':'대학'}</th><th scope="col" className="learning-ranking__number">{usersLabel}</th><th scope="col" className="learning-ranking__number">{recordsLabel}</th></tr></thead><tbody>{d.rows.map(r=><tr key={r.id}><td className="learning-ranking__rank">{r.rank}</td><td><span className="learning-ranking__title" title={r.label}>{r.label}</span><div className="learning-ranking__bar" aria-hidden="true"><i style={{width:`${r.users/max*100}%`}}/></div>{material&&<details><summary>전체 자료명</summary><p>{r.label}</p></details>}</td><td className="learning-ranking__number">{r.users.toLocaleString()}명</td><td className="learning-ranking__number">{r.records.toLocaleString()}{kind==='recent'?'쌍':'건'}</td></tr>)}</tbody></table>:<p>선택한 기간과 검색 조건에 해당하는 기록이 없습니다.</p>}
 <nav className="learning-ranking__pager" aria-label="순위 페이지"><button className="button button--outline button--small" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page} / {Math.max(1,d.total_pages)} 페이지</span><button className="button button--outline button--small" disabled={page>=d.total_pages} onClick={()=>setPage(p=>p+1)}>다음</button></nav></>}</div>;
}
