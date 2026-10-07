import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OfficialLink } from "@/components/official-link";
import { SourceStatusLabel } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";
import { getUniversityYear, listUniversities } from "@/lib/public-catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return listUniversities().map((university) => ({
    universityId: university.id,
    year: String(university.admissionYear),
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ universityId: string; year: string }> }): Promise<Metadata> {
  const { universityId, year } = await params;
  const university = getUniversityYear(universityId, year);
  return university ? buildMetadata(`${university.universityName} ${year} 전형 안내`, `${university.universityName} ${year} 논술 전형 안내입니다.`) : buildMetadata("전형 연도를 찾을 수 없음", "요청한 전형 정보를 찾을 수 없습니다.");
}

export default async function UniversityYearPage({ params }: { params: Promise<{ universityId: string; year: string }> }) {
  const { universityId, year } = await params;
  const university = getUniversityYear(universityId, year);
  if (!university) notFound();
  const link = university.sourceLinks[0];

  return <div className="page-section content-wrap content-wrap--detail"><Link className="back-link" href={`/essay-lab/universities/${university.id}`}>← {university.universityName} 개요</Link><section className="year-page"><p className="eyebrow eyebrow--accent">연도별 전형</p><div className="trust-row"><SourceStatusLabel status={university.sourceStatus} /><span className="tag">{year}학년도</span></div><h1>{university.universityName}<br />{year} 전형 맥락</h1><p className="year-page__lead">{university.admissionTrack}</p><div className="year-page__grid"><article><span>캠퍼스</span><strong>{university.campus}</strong></article><article><span>지역</span><strong>{university.region}</strong></article><article><span>전형 유형</span><strong>{university.examTypeLabel}</strong></article><article><span>논술 유형</span><strong>{university.taxonomyLabel}</strong></article></div><p className="detail-copy">문항 수, 답안 분량과 평가 기준은 해당 대학 입학처의 최신 자료를 확인하세요.</p>{link ? <OfficialLink link={link} /> : null}</section></div>;
}
