"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth-context";
import { authenticatedProductRoutes, publicReleaseRoutes } from "@/lib/release-routes";

/**
 * Session-aware primary navigation. The header reflects the real Supabase auth
 * state as its single source of truth. Before hydration and while the session
 * is loading or unconfigured it renders the public menu, so an authenticated
 * menu never flashes before the session is known; it switches to the product
 * menu only once the client confirms an authenticated session, and back to the
 * public menu on sign-out — without a full page reload.
 */
export function SiteNav() {
  const { status } = useAuth();
  const items = status === "authenticated" ? authenticatedProductRoutes : publicReleaseRoutes;

  return (
    <nav className="site-nav" aria-label="주요 메뉴">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>{item.label}</Link>
      ))}
    </nav>
  );
}
