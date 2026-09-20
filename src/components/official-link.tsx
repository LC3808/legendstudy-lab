import type { EssaySourceLink } from "@/types/domain";
import { resolveOfficialLink } from "@/lib/quick-link";

export function OfficialLink({ link, className = "" }: { link: EssaySourceLink; className?: string }) {
  const resolved = resolveOfficialLink(link);
  const content = (
    <>
      <span>{resolved.actionLabel}</span>
      {resolved.isExternal ? <span aria-hidden="true">↗</span> : null}
    </>
  );

  if (!resolved.href) {
    return (
      <div className={`official-link official-link--unavailable ${className}`}>
        <span>{content}</span>
        <small>{resolved.helperText}</small>
      </div>
    );
  }

  return (
    <div className={`official-link ${className}`}>
      <a href={resolved.href} target="_blank" rel="noreferrer noopener" className="button button--source">
        {content}
      </a>
      <small>{resolved.helperText}{resolved.requiresRecheck ? " 확인일: " + link.checkedDate : ""}</small>
    </div>
  );
}
