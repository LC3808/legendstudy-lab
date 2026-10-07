"use client";

import type { ReactNode } from "react";

import { availabilityOf, type AvailabilityState } from "@/lib/quality/view";

/**
 * Shared presentational primitives for the Quality Console. They keep the
 * `[]` vs `null` vs *present* distinction visible in the UI and render nested
 * contract values as readable structure — never as a raw JSON dump (task §29).
 */

export function QlSection({
  title,
  eyebrow,
  children,
  tone = "default",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  tone?: "default" | "core" | "ai";
}) {
  return (
    <section className={`ql-section ql-section--${tone}`} aria-label={title}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h3 className="ql-section__title">{title}</h3>
      <div className="ql-section__body">{children}</div>
    </section>
  );
}

/** Explicit "no data" states — callers choose unavailable vs empty deliberately. */
export function QlUnavailable({ label = "표시할 수 있는 canonical 값이 없습니다." }: { label?: string }) {
  return (
    <p className="ql-state ql-state--unavailable" data-availability="unavailable">
      {label}
    </p>
  );
}

export function QlEmpty({ label = "해당 항목이 비어 있습니다." }: { label?: string }) {
  return (
    <p className="ql-state ql-state--empty" data-availability="empty">
      {label}
    </p>
  );
}

/**
 * Render a group by its availability state. `unavailable` (null/absent) and
 * `empty` ([]/{}) get distinct explicit states; only `present` renders children.
 */
export function QlAvailability({
  value,
  unavailableLabel,
  emptyLabel,
  render,
}: {
  value: unknown;
  unavailableLabel?: string;
  emptyLabel?: string;
  render: () => ReactNode;
}) {
  const state: AvailabilityState = availabilityOf(value);
  if (state === "unavailable") return <QlUnavailable label={unavailableLabel} />;
  if (state === "empty") return <QlEmpty label={emptyLabel} />;
  return <>{render()}</>;
}

export function QlFieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="ql-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Format a scalar for display; null/absent becomes an explicit dash, not "0" or "". */
export function qlScalar(value: unknown): ReactNode {
  if (value === null || value === undefined) return <span className="ql-muted">—</span>;
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.length ? value : <span className="ql-muted">(빈 문자열)</span>;
  return <span className="ql-muted">—</span>;
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ");
}

/**
 * Readable structured renderer for contract groups whose deep sub-shape is not
 * fully enumerated (evidence bindings, history/reference scopes, etc.). Renders
 * objects as labeled rows and arrays as lists — a structured presentation, not a
 * raw JSON dump. Depth-bounded to stay legible and avoid pathological nesting.
 */
export function QlStructuredValue({ value, depth = 0 }: { value: unknown; depth?: number }): ReactNode {
  const state = availabilityOf(value);
  if (state === "unavailable") return <QlUnavailable />;
  if (state === "empty") return <QlEmpty />;

  if (Array.isArray(value)) {
    if (depth >= 3) return <span className="ql-muted">({value.length}개 항목)</span>;
    return (
      <ol className="ql-structured-list">
        {value.map((item, index) => (
          <li key={index}>
            <QlStructuredValue value={item} depth={depth + 1} />
          </li>
        ))}
      </ol>
    );
  }

  if (typeof value === "object" && value !== null) {
    if (depth >= 3) return <span className="ql-muted">(중첩 객체)</span>;
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <dl className="ql-field-list ql-field-list--nested">
        {entries.map(([key, child]) => (
          <QlFieldRow
            key={key}
            label={humanizeKey(key)}
            value={
              child !== null && typeof child === "object" ? (
                <QlStructuredValue value={child} depth={depth + 1} />
              ) : (
                qlScalar(child)
              )
            }
          />
        ))}
      </dl>
    );
  }

  return qlScalar(value);
}
