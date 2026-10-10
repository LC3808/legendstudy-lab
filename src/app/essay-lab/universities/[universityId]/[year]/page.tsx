import {loadResearchPreview} from '@/lib/essay-research/server';
import {researchUniversities} from '@/lib/essay-research/catalog';
import {ResearchUniversityView} from '@/components/essay-research-preview';
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OfficialLink } from "@/components/official-link";
import { SourceStatusLabel } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";
import { getUniversityYear, listUniversities } from "@/lib/public-catalog";

export const dynamicParams = false;

export async function generateStaticParams() {
  const preview=await loadResearchPreview();
  if(preview)return researchUniversities(preview).map(u=>({universityId:u.id,year:"2027"}));
  return listUniversities().map((university) => ({
    universityId: university.id,
    year: String(university.admissionYear),
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ universityId: string; year: string }> }): Promise<Metadata> {
  const { universityId, year } = await params;
  const preview=await loadResearchPreview();
  const candidate=preview?.offerings.find(o=>o.universityId===universityId);
  if(candidate)return {...buildMetadata(`${candidate.name} 전형 연구 미리보기`, '로컬 연구 후보 검토'),robots:{index:false,follow:false}};
  const university = getUniversityYear(universityId, year);
  return university ? buildMetadata(`${university.universityName} ${year} 전형 안내`, `${university.universityName} ${year} 논술 전형 안내입니다.`) : buildMetadata("전형 연도를 찾을 수 없음", "요청한 전형 정보를 찾을 수 없습니다.");
}

export default async function UniversityYearPage({ params }: { params: Promise<{ universityId: string; year: string }> }) {
  const { universityId, year } = await params;
  const preview=await loadResearchPreview();
  if(preview){if(!preview.offerings.some(o=>o.universityId===universityId&&String(o.year)===year))notFound();return <ResearchUniversityView catalog={preview} id={universityId} year={year}/>;}
  const university = getUniversityYear(universityId, year);
  if (!university) notFound();
  const link = university.sourceLinks[0];

  return <div className="page-section content-wrap content-wrap--detail"><Link className="back-link" href={`/essay-lab/universities/${university.id}`}>← {university.universityName} 개요</Link><section className="year-page"><p className="eyebrow eyebrow--accent">연도별 전형</p><div className="trust-row"><SourceStatusLabel status={university.sourceStatus} /><span className="tag">{year}학년도</span></div><h1>{university.universityName}<br />{year} 전형 맥락</h1><p className="year-page__lead">{university.admissionTrack}</p><div className="year-page__grid"><article><span>캠퍼스</span><strong>{university.campus}</strong></article><article><span>지역</span><strong>{university.region}</strong></article><article><span>전형 유형</span><strong>{university.examTypeLabel}</strong></article><article><span>논술 유형</span><strong>{university.taxonomyLabel}</strong></article></div><p className="detail-copy">문항 수, 답안 분량과 평가 기준은 해당 대학 입학처의 최신 자료를 확인하세요.</p>{link ? <OfficialLink link={link} /> : null}</section></div>;
}
