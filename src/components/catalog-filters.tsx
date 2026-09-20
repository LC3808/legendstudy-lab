"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { searchUniversities } from "@/lib/public-catalog";
import type { UniversityPublicMetadata } from "@/types/domain";
import { SourceStatusLabel } from "@/components/trust-label";

const regions = ["전체", "서울", "경기", "대구·경북", "부산·울산·경남"];
const taxonomies = [
  ["전체", "전체 유형"],
  ["long_essay_document_analysis", "장문 논술형"],
  ["structured_short_response", "약술형 응답"],
  ["science_response", "과학 응답형"],
  ["mixed_aat_structured_response", "복합형 AAT"],
] as const;

export function CatalogFilters({ universities }: { universities: UniversityPublicMetadata[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("전체");
  const [year, setYear] = useState("2027");
  const [taxonomy, setTaxonomy] = useState("전체");
  const results = useMemo(
    () => searchUniversities(universities, query, region, year, taxonomy),
    [universities, query, region, year, taxonomy],
  );

  return (
    <div className="catalog-filter">
      <div className="catalog-filter__controls" aria-label="대학 metadata 필터">
        <label className="search-control">
          <span className="sr-only">대학명 검색</span>
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="대학명, 지역, 전형 검색" />
        </label>
        <label className="select-control"><span>지역</span><select value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="select-control"><span>연도</span><select value={year} onChange={(event) => setYear(event.target.value)}><option>2027</option></select></label>
        <label className="select-control"><span>유형</span><select value={taxonomy} onChange={(event) => setTaxonomy(event.target.value)}>{taxonomies.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="catalog-filter__summary"><strong>{results.length}</strong>개 reviewed public fixture · 42개 대학/53개 모집단위 전체 inventory를 import하지 않은 foundation subset</div>
      <div className="university-grid">
        {results.map((university) => (
          <article className="university-card" key={university.id}>
            <div className="university-card__top"><SourceStatusLabel status={university.sourceStatus} /><span className="university-card__year">{university.admissionYear}</span></div>
            <h2>{university.universityName}</h2>
            <p className="university-card__location">{university.campus} · {university.region}</p>
            <div className="tag-row"><span className="tag tag--navy">{university.examTypeLabel}</span><span className="tag">{university.taxonomyLabel}</span></div>
            <p className="university-card__track">{university.admissionTrack}</p>
            <Link className="card-link" href={`/essay-lab/universities/${university.id}`}>전형 구조와 출처 보기 <span aria-hidden="true">→</span></Link>
          </article>
        ))}
      </div>
      {results.length === 0 ? <div className="empty-state"><h2>일치하는 대학이 없습니다.</h2><p>이 foundation은 소수의 reviewed public fixture만 사용합니다. 검색어나 필터를 조정해 보세요.</p></div> : null}
    </div>
  );
}
