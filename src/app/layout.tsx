import type { Metadata } from "next";

import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: brand.siteUrl ? new URL(brand.siteUrl) : undefined,
  title: {
    default: `${brand.productName} ${brand.byline}`,
    template: `%s | ${brand.productName} ${brand.byline}`,
  },
  description: "LegendStudy의 논술 서비스 LS LAB입니다. 현재는 서비스 공개를 위한 웹 기반을 준비하고 있습니다.",
  robots: { index: Boolean(brand.siteUrl), follow: Boolean(brand.siteUrl) },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
