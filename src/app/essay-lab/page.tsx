import { EssayRuntimeEntry } from "@/components/essay-runtime-entry";
import { CatalogFilters } from "@/components/catalog-filters";
import { EssayCreditStatus } from "@/components/essay-credit-status";
import { buildMetadata } from "@/lib/brand";
import { listUniversities } from "@/lib/public-catalog";

export const metadata = buildMetadata(
  "논술 LAB",
  "대학별 평가 기준에 맞춰 내 답안을 점검하고, 직접 다시 써보세요.",
);

export default function EssayLabPage() {
  const universities = listUniversities();
  return (
    <div className="page-section content-wrap essay-lab-page">
      <div className="page-intro">
        {/* Owner-approved copy. `논술 LAB` is the page identity, so it is a label;
            the sentence describing what the service does is the headline. This
            wording is copy authority and is not rewritten without Owner approval. */}
        <p className="essay-hero__label">논술 LAB</p>
        <h1 className="essay-hero__headline">대학별 평가 기준에 맞춰 내 답안을 점검하고, 직접 다시 써보세요.</h1>
      </div>
      {/* The visitor's spendable 첨삭권, read from the same `credit_summary()`
          authority MY uses. It sits above the catalog because it answers the first
          question a returning writer has before picking a university. */}
      <EssayCreditStatus />
      <EssayRuntimeEntry />
      <CatalogFilters universities={universities} />
    </div>
  );
}
