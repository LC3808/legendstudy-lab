import { businessInfo } from "@/lib/business-info";
import { effectiveDateLabel, type LegalBlock, type LegalDocument } from "@/lib/legal-documents";

/**
 * Renders a legal document from `src/lib/legal-documents.ts`.
 *
 * Headings become `<h2>` sections so the page keeps a single `<h1>` and a
 * semantic outline. The same component renders both the terms and the privacy
 * policy, which is why neither page restates a price, a period, an effective
 * date or a contact address on its own.
 *
 * The rendered page is a consumer-facing operating document: it carries no
 * pending-value placeholder, no review marker and no build-time state.
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
          <dt>시행일</dt>
          <dd>{effectiveDateLabel()}</dd>
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
    </>
  );
}