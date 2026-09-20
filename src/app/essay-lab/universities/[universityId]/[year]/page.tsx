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
  return university ? buildMetadata(`${university.universityName} ${year} 전형 metadata`, `${university.universityName} ${year} 논술 전형의 public metadata fixture입니다.`) : buildMetadata("전형 연도를 찾을 수 없음", "요청한 public metadata fixture를 찾을 수 없습니다.");
}

export default async function UniversityYearPage({ params }: { params: Promise<{ universityId: string; year: string }> }) {
  const { universityId, year } = await params;
  const university = getUniversityYear(universityId, year);
  if (!university) notFound();
  const link = university.sourceLinks[0];

  return <div className="page-section content-wrap content-wrap--detail"><Link className="back-link" href={`/essay-lab/universities/${university.id}`}>← {university.universityName} 개요</Link><section className="year-page"><p className="eyebrow eyebrow--accent">PUBLIC YEAR / TRACK METADATA</p><div className="trust-row"><SourceStatusLabel status={university.sourceStatus} /><span className="tag">{year}학년도</span></div><h1>{university.universityName}<br />{year} 전형 맥락</h1><p className="year-page__lead">{university.admissionTrack}</p><div className="year-page__grid"><article><span>캠퍼스</span><strong>{university.campus}</strong></article><article><span>지역</span><strong>{university.region}</strong></article><article><span>전형 유형</span><strong>{university.examTypeLabel}</strong></article><article><span>학생 표시 라벨</span><strong>{university.taxonomyLabel}</strong></article></div><p className="detail-copy">이 화면은 연도와 track을 university metadata에 묶어 보여 주는 App Router route foundation입니다. 문항 수, 답안 분량, 평가 기준처럼 공식 source에서 공개되지 않았거나 별도 검토가 필요한 정보는 가정하지 않습니다.</p>{link ? <OfficialLink link={link} /> : null}</section></div>;
}
