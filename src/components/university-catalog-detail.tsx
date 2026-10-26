'use client';
import {useState} from 'react';
import Link from 'next/link';
import {UniversityEssayHero} from './university-essay-hero';
import {campusLabel,type CatalogUniversity} from '@/lib/essay-runtime/public-discovery';
import {officialUrl} from '@/lib/essay-runtime/catalog';
import {UniversityEssayStart} from './university-essay-start';
import './essay-service.css';
import './essay-studio.css';

export function UniversityCatalogDetail({university:u,year}:{university:CatalogUniversity;year?:string}){
 const [selectedTitle,setSelectedTitle]=useState('학년도와 시험을 선택해 주세요.');
 const offerings=u.offerings.filter(o=>!year||String(o.admissionYear)===year);
 const schedule=offerings.filter(o=>o.admissionYear===2027).flatMap(o=>(o.admissionDetails??[])
  .filter(d=>['OFFICIAL_CONFIRMED','OFFICIAL_PARTIAL'].includes(d.sourceStatus)&&(d.facts.exam_date||d.facts.exam_time))
  .map(d=>({...d,campus:campusLabel(o.campus)})));
 // Reuse reviewed source records. Never relabel an admissions guide as past questions.
 const research=u.researchSources?.find(s=>officialUrl(s.url));
 const registeredCollege=['gachon','konkuk','kyunghee','korea','dongguk','sogang','skku','sookmyung','soongsil','swu','kau'].includes(u.sourceUniversityId);
 const fallback=registeredCollege?undefined:offerings.flatMap(o=>o.sources).find(s=>officialUrl(s));
 return <div className="university-detail-wrap"><div className="content-wrap essay-service university-detail university-detail--essay-first">
  <Link className="university-back" href="/essay-lab/">← 대학 목록</Link>
  <UniversityEssayHero university={u} selectedTitle={selectedTitle} officialLink={research?.url??fallback} officialLabel={research?'공식 논술 자료 확인':'공식 입학처 자료 확인'}>
  <details className="essay-schedule"><summary>2027학년도 논술 일정</summary>
   {schedule.length?<div className="university-info-grid">{schedule.map(d=><article className="university-panel" key={d.sourceId}>
    <h3>{d.name}</h3><dl className="university-facts"><div><dt>캠퍼스</dt><dd>{d.campus}</dd></div>
     {d.facts.exam_date&&<div><dt>시험 날짜</dt><dd>{d.facts.exam_date}</dd></div>}
     {d.facts.exam_time&&<div><dt>시험 시간</dt><dd>{d.facts.exam_time}</dd></div>}
    </dl><p className="university-source-note">{d.documentBasis} · 확인일 {d.verifiedAt}</p>
    {officialUrl(d.documentUrl??d.sourceUrl)&&<a href={officialUrl(d.documentUrl??d.sourceUrl)!} target="_blank" rel="noopener noreferrer">일정 출처 확인 ↗</a>}
   </article>)}</div>:<p>확인된 시험 일정이 없습니다. 공식 입학처 자료를 확인해 주세요.</p>}
  </details></UniversityEssayHero>
  <UniversityEssayStart onSelectionChange={setSelectedTitle} universityId={u.universityId} sourceId={u.sourceUniversityId}/>
 </div></div>;
}
