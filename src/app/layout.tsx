import {Suspense} from 'react';
import {AnalyticsCollection} from '@/components/analytics-collection';
import type { Metadata } from "next";

import "./fonts-nanum-gothic.css";
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
  description: "LegendStudy LAB은 내신·모의고사·수능·논술 데이터를 연결하는 개인 입시 분석·학습 플랫폼입니다. 나의 기록에서 강점과 다음 선택을 찾아보세요.",
  robots: { index: Boolean(brand.siteUrl), follow: Boolean(brand.siteUrl) },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <Suspense fallback={null}><AnalyticsCollection /></Suspense><AuthProvider>{process.env.NEXT_PUBLIC_SHARED_TEST_ENABLED === "true" && <aside role="note" style={{padding: 12, background: "#fff3d6", color: "#1c2948", textAlign: "center"}}>{process.env.NEXT_PUBLIC_COMMERCE_TEST_ENABLED === 'true' ? '상경·사회 첨삭 비공개 검수 · TEST 계정 전용 · 결제 불가' : '공통 TEST 환경 · 운영 계정과 데이터 분리 · 실제 평가 승인 대기 · 결제 불가'}</aside>}{process.env.NEXT_PUBLIC_LOCAL_QA_ENABLED === "true" && <aside role="note" style={{padding: 12, background: "#fff3d6", color: "#1c2948", textAlign: "center"}}>격리 검수 환경 · 합성 데이터 · 운영 평가 및 결제 불가</aside>}<SiteShell>{children}</SiteShell></AuthProvider>
      </body>
    </html>
  );
}
