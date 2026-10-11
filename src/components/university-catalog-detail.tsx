import Link from 'next/link';
import type {CatalogUniversity} from '@/lib/essay-runtime/public-discovery';
import {UniversityAvailability} from './university-availability';
import {EssayServiceCatalog} from './essay-service-catalog';
import './essay-service.css';
export function UniversityCatalogDetail({university:u,year}:{university:CatalogUniversity;year?:string}){
 const offerings=u.offerings.filter(o=>!year||String(o.admissionYear)===year);
 return <section className="content-wrap page-section essay-service"><Link href="/essay-lab/universities/">← 대학 목록</Link><h1>{u.name}</h1>
 <h2>전형 정보</h2>{offerings.map(o=><section className="catalog-card" key={o.id}><h3>{o.campus} · {o.admissionYear}학년도 전형</h3><p>{o.admissionNames.join(' · ')}</p><p>{o.types.join(' · ')||'논술 유형 확인 중'}</p><details><summary>전형 자료의 논술 유형</summary>{o.rawEssayTypes.map((t,i)=><p key={i}>{t}</p>)}</details>{o.sources.map((url,i)=><p key={url}><a href={url} target="_blank" rel="noopener noreferrer">출처 · {u.name} 입학처 공식 자료 {o.sources.length>1?i+1:''} ↗</a></p>)}<p>자료 확인일 {o.verifiedAt}</p>{!year&&<Link href={`/essay-lab/universities/${u.sourceUniversityId}/${o.admissionYear}/`}>{o.admissionYear}학년도 전형 보기</Link>}</section>)}
 <h2>문항 · 첨삭 제공 상태</h2><UniversityAvailability id={u.universityId}/><h2>기출문항</h2><p>위 전형 학년도와 실제 기출문제의 시험 학년도는 별도로 확인합니다.</p>
 {u.universityId?<EssayServiceCatalog universityId={u.universityId}/>:<><p>기출문제를 준비하고 있어요.</p><button className="button button--outline" disabled>자료 준비 중</button></>}
 </section>;
}
