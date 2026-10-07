/** The same product destinations are public before and after sign-in. */
export const publicReleaseRoutes = [
  { href: "/score-analysis/", label: "내신 LAB" },
  { href: "/exam-analysis/", label: "모의·수능 LAB" },
  { href: "/essay-lab/", label: "논술 LAB" },
  { href: "/pricing/", label: "이용 안내" },
] as const;

export const authenticatedProductRoutes = publicReleaseRoutes;

export const policyRoutes = [
  { href: "/privacy/", label: "개인정보처리방침" },
  { href: "/terms/", label: "이용약관" },
  { href: "/refund/", label: "환불정책" },
  { href: "/support/", label: "고객센터" },
  { href: "/account-deletion/", label: "계정 삭제 안내" },
] as const;

export const internalFoundationPathPrefixes = [
  "/admin",
  "/ql",
  "/lab",
  "/essay-lab",
  "/my",
  "/score-analysis",
  "/exam-analysis",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/account",
] as const;

/** Legacy guide URLs redirect to current destinations and are omitted from the sitemap. */
export const publicReleasePaths = ["/", "/pricing/"] as const;

/** Policy pages remain indexable; personal and example routes remain noindex. */
export const indexablePublicPaths = [
  ...publicReleasePaths,
  "/terms/",
  "/privacy/",
  "/refund/",
  "/support/",
] as const;
