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
  if (!university) return buildMetadata("대학 정보를 찾을 수 없음", "요청한 대학 metadata fixture를 찾을 수 없습니다.");
  return buildMetadata(`${university.universityName} ${university.admissionYear} 논술`, `${university.universityName}의 공개 전형 metadata와 공식 source navigation을 보여주는 LS LAB foundation 페이지입니다.`);
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
          <p className="eyebrow">PUBLIC METADATA</p>
          <h2>이 foundation에서 보이는 정보</h2>
          <dl className="metadata-list"><div><dt>공식 source</dt><dd>{university.sourceTitle}</dd></div><div><dt>분류</dt><dd>{university.taxonomyLabel}</dd></div><div><dt>확인일</dt><dd>{university.checkedDate}</dd></div><div><dt>출처</dt><dd>{university.officialAdmissionsUrl.replace(/^https?:\/\//, "")}</dd></div></dl>
          <p className="detail-copy">{university.sourceNote} public metadata와 공식 navigation만 제공하며, 공식 문제·지문·답안·루브릭은 이 프로젝트에 보관하거나 표시하지 않습니다.</p>
          {link ? <OfficialLink link={link} /> : null}
        </article>
        <aside className="review-card"><p className="eyebrow">SOURCE PROVENANCE</p><h2>자료 상태를 먼저 확인하세요.</h2><p>공개 URL은 출처 확인과 외부 navigation을 위한 것입니다. source-use permission, private package input, 또는 실제 평가 승인을 의미하지 않습니다.</p><ul><li>공식 확인: 공식 source metadata가 확인된 상태</li><li>LS LAB 분석: 미래에 별도 origin을 표시할 영역</li><li>자료 확인 필요: 최신 notice/archive를 다시 확인해야 하는 상태</li></ul></aside>
      </section>
      <section className="detail-actions"><MockNotice compact /><div><Link className="button button--outline" href={`/essay-lab/universities/${university.id}/${university.admissionYear}`}>연도·track metadata 보기</Link><Link className="button button--accent" href="/essay-lab/questions/synthetic-q-01">합성 연습 패키지 보기 <span aria-hidden="true">→</span></Link></div></section>
    </div>
  );
}
