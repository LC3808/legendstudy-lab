import type { Metadata } from "next";

import "./globals.css";
import { AuthProvider } from "@/components/auth-context";
import { SiteShell } from "@/components/site-shell";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: brand.siteUrl ? new URL(brand.siteUrl) : undefined,
  title: {
    default: `${brand.productName} ${brand.byline}`,
    template: `%s | ${brand.productName} ${brand.byline}`,
  },
  description: "LegendStudy LAB은 내신·모의고사·수능·논술 데이터를 연결하는 개인 입시 분석·학습 플랫폼입니다. 현재는 서비스 방향과 공개 범위를 안내하는 웹 기반을 준비하고 있습니다.",
  robots: { index: Boolean(brand.siteUrl), follow: Boolean(brand.siteUrl) },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider><SiteShell>{children}</SiteShell></AuthProvider>
      </body>
    </html>
  );
}
