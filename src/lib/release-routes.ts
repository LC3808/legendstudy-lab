export const publicReleaseRoutes = [
  { href: "/", label: "서비스" },
  { href: "/lab/how-it-works/", label: "이용 안내" },
  { href: "/pricing/", label: "요금 안내" },
  { href: "/lab/coverage/", label: "공개 범위" },
] as const;

export const authenticatedProductRoutes = [
  { href: "/", label: "홈" },
  { href: "/score-analysis/", label: "성적 분석" },
  { href: "/essay-lab/", label: "논술 LAB" },
  { href: "/my/essays/", label: "내 기록" },
  { href: "/account/", label: "마이페이지" },
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

export const publicReleasePaths = publicReleaseRoutes.map((route) => route.href);

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
