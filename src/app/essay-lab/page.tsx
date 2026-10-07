import { CatalogFilters } from "@/components/catalog-filters";
import { EssayCreditStatus } from "@/components/essay-credit-status";
import { buildMetadata } from "@/lib/brand";
import { listUniversities } from "@/lib/public-catalog";

export const metadata = buildMetadata(
  "논술 LAB",
  "대학별 논술 전형과 공식 자료를 살펴보세요.",
);

export default function EssayLabPage() {
  const universities = listUniversities();
  return (
    <div className="page-section content-wrap essay-lab-page">
      <div className="page-intro">
        <p className="eyebrow eyebrow--accent">ESSAY LAB / EXPLORE</p>
        <h1>논술 LAB</h1>
        <p>대학별 논술 전형과 공식 자료를 살펴보세요. 최종 지원 전에는 입학처의 최신 모집요강을 확인하세요.</p>
      </div>
      {/* The visitor's spendable 첨삭권, read from the same `credit_summary()`
          authority MY uses. It sits above the catalog because it answers the first
          question a returning writer has before picking a university. */}
      <EssayCreditStatus />
      <CatalogFilters universities={universities} />
    </div>
  );
}
