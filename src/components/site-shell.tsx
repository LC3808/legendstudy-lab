import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AccountControl } from "@/components/account-control";
import { brand } from "@/lib/brand";
import { SiteNav } from "@/components/site-nav";
import { policyRoutes } from "@/lib/release-routes";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" href="/" aria-label="LegendStudy LAB 홈">
            <span className="brand__mark" aria-hidden="true"><Image src="/brand/legendstudy-app-icon.png" width={1024} height={1024} alt="" unoptimized /></span>
            <span className="brand__name">{brand.productName}</span>
            <span className="brand__phase">{brand.phaseLabel}</span>
          </Link>
          <SiteNav />
          <div className="site-header__actions">
            <AccountControl />
            <Link className="button button--accent button--small" href="/support/">지원 안내</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div>
            <p><strong>{brand.productName}</strong> {brand.byline} · 서비스 안내</p>
            <p>현재 공개 범위와 향후 학습 흐름을 구분해 안내합니다. 준비되지 않은 기능은 실제 서비스처럼 표시하지 않습니다.</p>
          </div>
          <nav className="footer-nav" aria-label="정책과 지원">
            {policyRoutes.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </nav>
        </div>
      </footer>
    </div>
  );
}
