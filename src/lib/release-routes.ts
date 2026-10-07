/**
 * The signed-out header menu.
 *
 * NAV hotfix: "이용 안내" opens the information a buyer actually needs — the
 * Credit products, their price, the 1 Credit scope, validity, refunds and who to
 * contact — and all of that is on /pricing/. It must never route to the release
 * scope pages, so `/lab/how-it-works/` is not a primary-nav destination, and the
 * menu carries no second link to the same page.
 */
export const publicReleaseRoutes = [
  { href: "/", label: "서비스" },
  { href: "/pricing/", label: "이용 안내" },
  { href: "/lab/coverage/", label: "공개 범위" },
] as const;

export const authenticatedProductRoutes = [
  { href: "/", label: "홈" },
  { href: "/score-analysis/", label: "내신 분석 LAB" },
  { href: "/score-analysis/", label: "모의·수능 분석 LAB" },
  { href: "/essay-lab/", label: "논술 LAB" },
] as const;

export const policyRoutes = [
  { href: "/privacy/", label: "개인정보처리방침" },
  { href: "/terms/", label: "이용약관" },
  { href: "/refund/", label: "환불정책" },
  { href: "/support/", label: "고객센터" },
  { href: "/account-deletion/", label: "계정 삭제 안내" },
] as const;

export const internalFoundationPathPrefixes = [
  "/lab",
  "/essay-lab",
  "/my",
  "/score-analysis",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/account",
] as const;

/**
 * Every public document, including the release-scope page that is no longer a
 * header destination. robots.ts and the sitemap read this list, so dropping
 * `/lab/how-it-works/` from the menu does not silently de-index the page itself —
 * the page survives, it is simply no longer advertised as "이용 안내".
 */
export const publicReleasePaths = [
  "/",
  "/pricing/",
  "/lab/coverage/",
  "/lab/how-it-works/",
] as const;

/**
 * Public documents that search engines may index alongside the entry routes.
 * The auth, essay and My routes stay out of this list and stay disallowed in
 * robots.txt, so a reviewer or crawler can always reach the sale conditions
 * without being sent into a foundation screen.
 */
export const indexablePublicPaths = [
  ...publicReleasePaths,
  "/terms/",
  "/privacy/",
  "/refund/",
  "/support/",
] as const;
