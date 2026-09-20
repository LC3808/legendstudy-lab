import { CatalogFilters } from "@/components/catalog-filters";
import { MockNotice } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";
import { listUniversities } from "@/lib/public-catalog";

export const metadata = buildMetadata(
  "Essay Lab · 대학별 논술 탐색",
  "대학·연도·전형과 공식 source metadata를 출처 상태와 함께 탐색하는 LS LAB foundation catalog입니다.",
);

export default function EssayLabPage() {
  const universities = listUniversities();
  return (
    <div className="page-section content-wrap">
      <div className="page-intro">
        <p className="eyebrow eyebrow--accent">ESSAY LAB / EXPLORE</p>
        <h1>대학별 논술을<br />구조부터 살펴보세요.</h1>
        <p>2027 공식 문서에서 확인한 소수의 대학·캠퍼스·track metadata fixture입니다. 최종 지원 전에는 반드시 해당 대학 입학처의 최신 모집요강을 다시 확인하세요.</p>
      </div>
      <MockNotice compact />
      <CatalogFilters universities={universities} />
    </div>
  );
}
