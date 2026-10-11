'use client';
import Link from 'next/link';
import {useState} from 'react';
import {filterCatalog,publicCatalog} from '@/lib/essay-runtime/public-discovery';
import './essay-service.css';
import {UniversityAvailability} from './university-availability';
export function UniversityDiscovery(){
 const [query,setQuery]=useState(''),[region,setRegion]=useState(''),[type,setType]=useState(''),[year,setYear]=useState(''),[page,setPage]=useState(0);
 const rows=filterCatalog(query,region,type,year),pages=Math.max(1,Math.ceil(rows.length/12)),current=Math.min(page,pages-1);
 function change(set:(v:string)=>void,value:string){set(value);setPage(0);}
 return <section className="essay-service university-discovery" aria-label="전국 대학 탐색">
 <div className="discovery-filters"><label>대학 검색<input type="search" value={query} onChange={e=>change(setQuery,e.target.value)}/></label>
 <label>지역<select value={region} onChange={e=>change(setRegion,e.target.value)}><option value="">전체</option>{['서울','경기·인천','기타 지역'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>논술 유형<select value={type} onChange={e=>change(setType,e.target.value)}><option value="">전체</option>{['인문','경제·경영','수리','과학'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>전형 학년도<select value={year} onChange={e=>change(setYear,e.target.value)}><option value="">전체</option>{[...new Set(publicCatalog.universities.flatMap(u=>u.offerings.map(o=>o.admissionYear)))].map(x=><option key={x}>{x}</option>)}</select></label></div>
 <p role="status">{rows.length}개 대학 · 전형 정보 기준</p>
 <div className="discovery-grid">{rows.slice(current*12,current*12+12).map(u=><article key={u.sourceUniversityId} className="catalog-card"><h2><Link href={`/essay-lab/universities/${u.sourceUniversityId}/`}>{u.name}</Link></h2>{u.offerings.map(o=><div key={o.id}><p>{o.campus} · {o.admissionYear}학년도</p><p>{o.types.join(' · ')||'논술 유형 확인 중'}</p></div>)}<UniversityAvailability id={u.universityId}/><Link className="button button--outline" href={`/essay-lab/universities/${u.sourceUniversityId}/`}>자료 보기</Link></article>)}</div>
 {!rows.length&&<p>검색 조건에 맞는 대학이 없습니다.</p>}
 <nav className="discovery-pagination" aria-label="대학 목록 페이지"><button className="button button--outline" disabled={current===0} onClick={()=>setPage(current-1)}>이전</button><span>{current+1} / {pages}</span><button className="button button--outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>다음</button></nav>
 </section>;
}
