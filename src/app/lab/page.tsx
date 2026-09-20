import Link from "next/link";
import type { Metadata } from "next";

import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "LegendStudy LAB",
  "LegendStudy LAB의 canonical 서비스 소개 페이지로 이동합니다.",
  "/",
  { index: false },
);

/**
 * Cloudflare Pages redirects this compatibility path to `/` before the static
 * file is served. This fallback remains usable on a plain static host.
 */
export default function LegacyLabRoute() {
  return (
    <main className="status-page" id="main-content">
      <meta httpEquiv="refresh" content="0; url=/" />
      <div className="status-page__card">
        <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB</p>
        <h1>LegendStudy LAB 메인으로 이동합니다.</h1>
        <p>자동 이동이 되지 않으면 아래 링크를 선택해 주세요.</p>
        <Link className="button button--primary" href="/">LegendStudy LAB 열기 <span aria-hidden="true">→</span></Link>
      </div>
    </main>
  );
}
