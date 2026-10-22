'use client';
import {isUniversityServicePreparing} from '@/lib/essay-runtime/catalog-policy';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {filterCatalog,publicCatalog,campusLabel,isFeaturedUniversity} from '@/lib/essay-runtime/public-discovery';
import './essay-service.css';
import {sortCatalog,type CatalogSort} from '@/lib/essay-runtime/catalog-sorting';
import {UniversityLogo,UniversityRegions,CatalogIcon} from './university-identity';
import {EssayTypeBadges} from './university-badges';
import {isPriorityUniversity} from '@/lib/essay-runtime/catalog-policy';
import {UniversityAvailability} from './university-availability';
export function UniversityDiscovery({essayFirst=false}:{essayFirst?:boolean}){
 const storeKey=`legendstudy:essay-discovery:v1:${essayFirst?'essay':'guide'}`;
 const [query,setQuery]=useState(''),[region,setRegion]=useState(''),[type,setType]=useState(''),[year,setYear]=useState(''),[page,setPage]=useState(0),[featured,setFeatured]=useState(false),[sort,setSort]=useState<CatalogSort>('service'),[all,setAll]=useState(false),[restored,setRestored]=useState(false);
 // Restore the list view once on mount so returning from a detail page (browser back or the in-page "대학 목록" link, both remount this) keeps the same page/filters/view.
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;try{const raw=sessionStorage.getItem(storeKey);if(raw){const s=JSON.parse(raw);
  if(typeof s.query==='string')setQuery(s.query);if(typeof s.region==='string')setRegion(s.region);if(typeof s.type==='string')setType(s.type);if(typeof s.year==='string')setYear(s.year);
  if(typeof s.sort==='string')setSort(s.sort as CatalogSort);if(typeof s.featured==='boolean')setFeatured(s.featured);if(typeof s.all==='boolean')setAll(s.all);if(Number.isInteger(s.page))setPage(s.page);}
 }catch{/* session storage unavailable; start from defaults */}setRestored(true);});return()=>{active=false;};},[storeKey]);
 // Persist only after the restore pass completed, so the stored view is never clobbered by initial defaults (incl. StrictMode double-mount).
 useEffect(()=>{if(!restored)return;try{sessionStorage.setItem(storeKey,JSON.stringify({query,region,type,year,page,featured,sort,all}));}catch{/* ignore */}},[restored,storeKey,query,region,type,year,page,featured,sort,all]);
 const rows=sortCatalog(filterCatalog(query,essayFirst?'':region,essayFirst?'':type,essayFirst?'':year).filter(u=>!featured||isFeaturedUniversity(u)),sort),pages=Math.max(1,Math.ceil(rows.length/12)),current=Math.min(page,pages-1);
 const visible=all?rows:rows.slice(current*12,current*12+12);
 function change(set:(v:string)=>void,value:string){set(value);setPage(0);}
 return <section className={`essay-service university-discovery${essayFirst?' university-discovery--essay-first':''}`} aria-label="전국 대학 탐색">
 <div className="discovery-topline"><div><p className="university-eyebrow">{essayFirst?'UNIVERSITY SEARCH':'UNIVERSITY GUIDE'}</p><h2>{essayFirst?'대학 찾기':'나에게 맞는 대학 찾기'}</h2></div><div className="discovery-switch" aria-label="대학 목록 범위"><button type="button" aria-pressed={!featured} onClick={()=>{setFeatured(false);setPage(0);}}>전체 42개</button><button type="button" aria-pressed={featured} onClick={()=>{setFeatured(true);setPage(0);}}>주요 대학</button></div></div>
 <div className="discovery-filters"><label>대학 검색<span className="university-search"><CatalogIcon kind="search"/><input type="search" placeholder="대학명을 검색해 보세요." value={query} onChange={e=>change(setQuery,e.target.value)}/></span></label>
 {!essayFirst&&<><label>지역<select value={region} onChange={e=>change(setRegion,e.target.value)}><option value="">전체</option>{['서울','경기·인천','기타 지역'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>논술 유형<select value={type} onChange={e=>change(setType,e.target.value)}><option value="">전체</option>{['인문','경제·경영','수리','과학','단답·약술형'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>전형 학년도<select value={year} onChange={e=>change(setYear,e.target.value)}><option value="">전체</option>{[...new Set(publicCatalog.universities.flatMap(u=>u.offerings.map(o=>o.admissionYear)))].map(x=><option key={x}>{x}</option>)}</select></label></>}</div>
 <div className="discovery-result"><p role="status">{rows.length}개 대학{!essayFirst&&' · 전형 정보 기준'}</p><select aria-label="대학 정렬" value={sort} onChange={e=>{setSort(e.target.value as CatalogSort);setPage(0);}}><option value="service">서비스 우선순위순</option><option value="applicants">지원자 수순</option><option value="competition">경쟁률순</option><option value="name">대학명순</option></select></div>
 {(sort==='applicants'||sort==='competition')&&<p className="catalog-sort-note">검증된 2027학년도 통계가 없는 대학은 서비스 우선순위를 적용합니다.</p>}
 <div className="discovery-grid">{visible.map(u=><article key={u.sourceUniversityId} className="university-card">
 <div className="university-card-top"><UniversityLogo university={u}/>{!essayFirst&&<UniversityRegions offerings={u.offerings}/>}</div><div className="university-card-heading"><h3><Link href={`/essay-lab/universities/${u.sourceUniversityId}/`}>{u.name}</Link></h3></div>
 {!essayFirst&&<><div className="university-card-meta">{u.offerings.map(o=><p key={o.id}>{campusLabel(o.campus)} · {o.admissionYear}학년도</p>)}</div>
 <EssayTypeBadges types={u.offerings.flatMap(o=>o.types)}/>
 <div className="university-card-status"><UniversityAvailability id={u.universityId} later={!isPriorityUniversity(u.sourceUniversityId)} detailed typesKnown={u.offerings.some(o=>o.types.length>0)}/></div></>}
 {essayFirst&&isUniversityServicePreparing(u.sourceUniversityId)?<button className="university-primary service-preparing" disabled>서비스 준비중</button>:<Link className="university-primary" aria-label={`${u.name} ${essayFirst?'첨삭 시작하기':'자료 보기'}`} href={`/essay-lab/universities/${u.sourceUniversityId}/`}>{essayFirst?'첨삭 시작하기':'자료 보기'} <span aria-hidden="true">→</span></Link>}</article>)}</div>
 {!rows.length&&<p>검색 조건에 맞는 대학이 없습니다.</p>}
 <nav className="discovery-pagination" aria-label="대학 목록 페이지">{all?<span>{rows.length}개 대학 전체 표시</span>:<><button className="button button--outline" disabled={current===0} onClick={()=>setPage(current-1)}>이전</button><span>{current+1} / {pages}</span><button className="button button--outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>다음</button></>}<button type="button" className="button button--outline discovery-viewall" aria-pressed={all} onClick={()=>setAll(v=>!v)}>{all?'페이지 보기':'전체보기'}</button></nav>
 </section>;
}
