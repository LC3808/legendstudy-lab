import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OfficialLink } from "@/components/official-link";
import { UniversityStructuredData } from "@/components/structured-data";
import { MockNotice, OriginLabel, SourceStatusLabel } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";
import { getUniversity, listUniversities } from "@/lib/public-catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return listUniversities().map((university) => ({ universityId: university.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ universityId: string }> }): Promise<Metadata> {
  const { universityId } = await params;
  const university = getUniversity(universityId);
  if (!university) return buildMetadata("대학 정보를 찾을 수 없음", "요청한 대학 정보를 찾을 수 없습니다.");
  return buildMetadata(`${university.universityName} ${university.admissionYear} 논술`, `${university.universityName}의 논술 전형과 공식 자료를 확인하세요.`);
}

export default async function UniversityDetailPage({ params }: { params: Promise<{ universityId: string }> }) {
  const { universityId } = await params;
  const university = getUniversity(universityId);
  if (!university) notFound();
  const link = university.sourceLinks[0];

  return (
    <div className="page-section content-wrap content-wrap--detail">
      <UniversityStructuredData university={university} />
      <Link className="back-link" href="/essay-lab">← 대학 목록</Link>
      <section className="detail-hero">
        <div><div className="trust-row"><OriginLabel origin={university.origin} /><SourceStatusLabel status={university.sourceStatus} /></div><h1>{university.universityName}</h1><p>{university.campus} · {university.region} · {university.admissionYear}학년도</p></div>
        <div className="detail-hero__meta"><span>전형</span><strong>{university.admissionTrack}</strong><span>유형</span><strong>{university.examTypeLabel}</strong></div>
      </section>
      <section className="detail-grid">
        <article className="surface-card">
          <p className="eyebrow">논술 전형</p>
          <h2>전형과 출처</h2>
          <dl className="metadata-list"><div><dt>공식 자료</dt><dd>{university.sourceTitle}</dd></div><div><dt>분류</dt><dd>{university.taxonomyLabel}</dd></div><div><dt>확인일</dt><dd>{university.checkedDate}</dd></div><div><dt>출처</dt><dd>{university.officialAdmissionsUrl.replace(/^https?:\/\//, "")}</dd></div></dl>
          <p className="detail-copy">최신 모집요강과 기출문제는 아래 입학처 공식 자료에서 확인하세요.</p>
          {link ? <OfficialLink link={link} /> : null}
        </article>
        <aside className="review-card"><h2>지원 전 확인하세요.</h2><p>전형 내용은 변경될 수 있습니다. 해당 대학 입학처의 최신 모집요강과 공지를 기준으로 확인하세요.</p></aside>
      </section>
      <section className="detail-actions"><MockNotice compact /><div><Link className="button button--outline" href={`/essay-lab/universities/${university.id}/${university.admissionYear}`}>연도별 전형 보기</Link><Link className="button button--accent" href="/essay-lab/questions/synthetic-q-01">연습 예시 보기 <span aria-hidden="true">→</span></Link></div></section>
    </div>
  );
}
