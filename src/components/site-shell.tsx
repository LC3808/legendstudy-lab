import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AccountControl } from "@/components/account-control";
import { BusinessInfoList, CustomerCenterFooterContact } from "@/components/business-info-block";
import { brand } from "@/lib/brand";
import { SiteNav } from "@/components/site-nav";
import { policyRoutes } from "@/lib/release-routes";

/**
 * Public shell for every route. The footer carries the Owner-confirmed business
 * identity and the customer centre e-mail channels on every page, because a
 * Toss reviewer must be able to confirm the seller, the registration numbers
 * and a real contact channel without signing in.
 *
 * The telephone channel is deliberately absent here: it is published for
 * verification on the support page as a secondary contact, not promoted as the
 * way to reach support.
 */
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
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <p className="site-footer__product"><strong>{brand.productName}</strong> {brand.byline}</p>
            <BusinessInfoList showServiceContact={false} />
            <CustomerCenterFooterContact />
          </div>
          <nav className="footer-nav" aria-label="정책과 고객지원">
            {policyRoutes.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </nav>
        </div>
      </footer>
    </div>
  );
}
