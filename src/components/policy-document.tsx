import { businessInfo, ownerPendingLabel } from "@/lib/business-info";
import { pendingItemsFor, type LegalBlock, type LegalDocument } from "@/lib/legal-documents";

/**
 * Renders a legal document from `src/lib/legal-documents.ts`.
 *
 * Headings become `<h2>` sections so the page keeps a single `<h1>` and a
 * semantic outline. The same component renders both the terms and the privacy
 * policy, which is why neither page restates a price, a period or a contact
 * address on its own.
 */

type Section = { readonly heading?: string; readonly blocks: readonly LegalBlock[] };

/** Splits the flat block list into sections that start at each heading. */
function groupSections(blocks: readonly LegalBlock[]): Section[] {
  const sections: Section[] = [];
  let current: { heading?: string; blocks: LegalBlock[] } = { blocks: [] };

  for (const block of blocks) {
    if (block.kind === "heading") {
      if (current.heading || current.blocks.length > 0) sections.push(current);
      current = { heading: block.text, blocks: [] };
      continue;
    }
    current.blocks.push(block);
  }
  if (current.heading || current.blocks.length > 0) sections.push(current);

  return sections;
}

function BlockBody({ block }: { block: LegalBlock }) {
  if (block.kind === "paragraph") return <p>{block.text}</p>;

  if (block.kind === "items") {
    return (
      <ul className="policy-list">
        {block.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }

  if (block.kind === "definitions") {
    return (
      <dl className="policy-definitions">
        {block.entries.map((entry) => (
          <div key={entry.term}>
            <dt>{entry.term}</dt>
            <dd>{entry.description}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return null;
}

export function PolicyDocument({ document }: { document: LegalDocument }) {
  const sections = groupSections(document.blocks);
  const pending = pendingItemsFor(document);

  return (
    <>
      <p className="eyebrow eyebrow--accent">{document.eyebrow}</p>
      <div className="policy-page__heading">
        <h1>{document.heading}</h1>
      </div>
      <p className="policy-page__lead">{document.summary}</p>

      <dl className="doc-meta">
        <div>
          <dt>운영 주체</dt>
          <dd>{businessInfo.legalName}</dd>
        </div>
        <div>
          <dt>문서 작성일</dt>
          <dd>{document.preparedOn}</dd>
        </div>
        <div>
          <dt>시행일</dt>
          <dd>{document.effectiveDate ?? ownerPendingLabel}</dd>
        </div>
      </dl>

      {sections.map((section, index) => (
        <section
          className="policy-section"
          key={section.heading ?? `section-${index}`}
          aria-labelledby={section.heading ? `${document.id}-section-${index}` : undefined}
        >
          {section.heading ? <h2 id={`${document.id}-section-${index}`}>{section.heading}</h2> : null}
          {section.blocks.map((block, blockIndex) => (
            <BlockBody block={block} key={`${index}-${blockIndex}`} />
          ))}
        </section>
      ))}

      {pending.length > 0 ? (
        <section className="policy-section" aria-labelledby={`${document.id}-pending`}>
          <h2 id={`${document.id}-pending`}>Owner 확인 대기 항목</h2>
          <p>
            아래 항목은 운영자가 아직 확정하지 않아 임의로 작성하지 않았습니다. 확정되는 대로 이 문서에 반영합니다.
            해당 항목이 확정되기 전에도 이 문서의 나머지 내용과 상품 조건은 그대로 적용됩니다.
          </p>
          <dl className="owner-pending">
            {pending.map((item) => (
              <div key={item.key}>
                <dt>{item.label}</dt>
                <dd>{item.reason}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </>
  );
}