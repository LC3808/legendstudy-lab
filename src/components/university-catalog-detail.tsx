'use client';
import {useState} from 'react';
import Link from 'next/link';
import {UniversityEssayHero} from './university-essay-hero';
import {UniversitySchedulePanel} from './university-schedule';
import {type CatalogUniversity} from '@/lib/essay-runtime/public-discovery';
import {officialUrl} from '@/lib/essay-runtime/catalog';
import {UniversityEssayStart} from './university-essay-start';
import './essay-service.css';
import './essay-studio.css';

export function UniversityCatalogDetail({university:u,year}:{university:CatalogUniversity;year?:string}){
 const [selectedTitle,setSelectedTitle]=useState('학년도와 시험을 선택해 주세요.');
 const offerings=u.offerings.filter(o=>!year||String(o.admissionYear)===year);
 // Reuse reviewed source records. Never relabel an admissions guide as past questions.
 const research=u.researchSources?.find(s=>officialUrl(s.url));
 const registeredCollege=['gachon','konkuk','kyunghee','korea','dongguk','sogang','skku','sookmyung','soongsil','swu','kau'].includes(u.sourceUniversityId);
 const fallback=registeredCollege?undefined:offerings.flatMap(o=>o.sources).find(s=>officialUrl(s));
 return <div className="university-detail-wrap"><div className="content-wrap essay-service university-detail university-detail--essay-first">
  <Link className="university-back" href="/essay-lab/">← 대학 목록</Link>
  <UniversityEssayHero university={u} selectedTitle={selectedTitle} officialLink={research?.url??fallback} officialLabel={research?'공식 논술 자료 확인':'공식 입학처 자료 확인'}>
  <UniversitySchedulePanel university={u}/></UniversityEssayHero>
  <UniversityEssayStart onSelectionChange={setSelectedTitle} universityId={u.universityId} sourceId={u.sourceUniversityId}/>
 </div></div>;
}
