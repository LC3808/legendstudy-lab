import Link from "next/link";
import { NoticeNavLink } from "./notices";
import { publicReleaseRoutes } from "@/lib/release-routes";

export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="주요 메뉴">
      <NoticeNavLink />
      {publicReleaseRoutes.map((item) => (
        <Link key={item.href} href={item.href}>{item.label}</Link>
      ))}
    </nav>
  );
}
