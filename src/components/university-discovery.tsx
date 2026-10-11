'use client';
import Link from 'next/link';
import {useState} from 'react';
import {filterCatalog,publicCatalog,campusLabel,isFeaturedUniversity} from '@/lib/essay-runtime/public-discovery';
import './essay-service.css';
import {sortCatalog,type CatalogSort} from '@/lib/essay-runtime/catalog-sorting';
import {UniversityLogo,UniversityRegions,CatalogIcon} from './university-identity';
import {EssayTypeBadges} from './university-badges';
import {isPriorityUniversity} from '@/lib/essay-runtime/catalog-policy';
import {UniversityAvailability} from './university-availability';
export function UniversityDiscovery(){
 const [query,setQuery]=useState(''),[region,setRegion]=useState(''),[type,setType]=useState(''),[year,setYear]=useState(''),[page,setPage]=useState(0),[featured,setFeatured]=useState(false),[sort,setSort]=useState<CatalogSort>('service');
 const rows=sortCatalog(filterCatalog(query,region,type,year).filter(u=>!featured||isFeaturedUniversity(u)),sort),pages=Math.max(1,Math.ceil(rows.length/12)),current=Math.min(page,pages-1);
 function change(set:(v:string)=>void,value:string){set(value);setPage(0);}
 return <section className="essay-service university-discovery" aria-label="전국 대학 탐색">
 <div className="discovery-topline"><div><p className="university-eyebrow">UNIVERSITY GUIDE</p><h2>나에게 맞는 대학 찾기</h2></div><div className="discovery-switch" aria-label="대학 목록 범위"><button type="button" aria-pressed={!featured} onClick={()=>{setFeatured(false);setPage(0);}}>전체 42개</button><button type="button" aria-pressed={featured} onClick={()=>{setFeatured(true);setPage(0);}}>주요 대학</button></div></div>
 <div className="discovery-filters"><label>대학 검색<span className="university-search"><CatalogIcon kind="search"/><input type="search" placeholder="대학명을 검색해 보세요." value={query} onChange={e=>change(setQuery,e.target.value)}/></span></label>
 <label>지역<select value={region} onChange={e=>change(setRegion,e.target.value)}><option value="">전체</option>{['서울','경기·인천','기타 지역'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>논술 유형<select value={type} onChange={e=>change(setType,e.target.value)}><option value="">전체</option>{['인문','경제·경영','수리','과학','단답·약술형'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>전형 학년도<select value={year} onChange={e=>change(setYear,e.target.value)}><option value="">전체</option>{[...new Set(publicCatalog.universities.flatMap(u=>u.offerings.map(o=>o.admissionYear)))].map(x=><option key={x}>{x}</option>)}</select></label></div>
 <div className="discovery-result"><p role="status">{rows.length}개 대학 · 전형 정보 기준</p><select aria-label="대학 정렬" value={sort} onChange={e=>{setSort(e.target.value as CatalogSort);setPage(0);}}><option value="service">서비스 우선순위순</option><option value="applicants">지원자 수순</option><option value="competition">경쟁률순</option><option value="name">대학명순</option></select></div>
 {(sort==='applicants'||sort==='competition')&&<p className="catalog-sort-note">검증된 2027학년도 통계가 없는 대학은 서비스 우선순위를 적용합니다.</p>}
 <div className="discovery-grid">{rows.slice(current*12,current*12+12).map(u=><article key={u.sourceUniversityId} className="university-card">
 <div className="university-card-top"><UniversityLogo university={u}/><UniversityRegions offerings={u.offerings}/></div><div className="university-card-heading"><h3><Link href={`/essay-lab/universities/${u.sourceUniversityId}/`}>{u.name}</Link></h3></div>
 <div className="university-card-meta">{u.offerings.map(o=><p key={o.id}>{campusLabel(o.campus)} · {o.admissionYear}학년도</p>)}</div>
 <EssayTypeBadges types={u.offerings.flatMap(o=>o.types)}/>
 <div className="university-card-status"><UniversityAvailability id={u.universityId} later={!isPriorityUniversity(u.sourceUniversityId)} detailed typesKnown={u.offerings.some(o=>o.types.length>0)}/></div>
 <Link className="university-primary" aria-label={`${u.name} 자료 보기`} href={`/essay-lab/universities/${u.sourceUniversityId}/`}>자료 보기 <span aria-hidden="true">→</span></Link></article>)}</div>
 {!rows.length&&<p>검색 조건에 맞는 대학이 없습니다.</p>}
 <nav className="discovery-pagination" aria-label="대학 목록 페이지"><button className="button button--outline" disabled={current===0} onClick={()=>setPage(current-1)}>이전</button><span>{current+1} / {pages}</span><button className="button button--outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>다음</button></nav>
 </section>;
}
