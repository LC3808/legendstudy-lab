import Link from "next/link";
import type { Metadata } from "next";

import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "LegendStudy LAB",
  "레전드스터디+의 논술 서비스 LegendStudy LAB 소개 페이지입니다.",
  "/",
  { index: false },
);

/**
 * Cloudflare Pages applies public/_redirects before this static fallback.
 * The page remains usable in a plain static host where redirect rules are not
 * available, without claiming that a live feature is ready.
 */
export default function RootPage() {
  return (
    <main className="status-page" id="main-content">
      <meta httpEquiv="refresh" content="0; url=/lab" />
      <div className="status-page__card">
        <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB</p>
        <h1>LegendStudy LAB로 이동합니다.</h1>
        <p>자동 이동이 되지 않으면 아래 링크를 선택해 주세요.</p>
        <Link className="button button--primary" href="/lab">LegendStudy LAB 열기 <span aria-hidden="true">→</span></Link>
      </div>
    </main>
  );
}
