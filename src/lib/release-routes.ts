export const publicReleaseRoutes = [
  { href: "/", label: "LAB 소개" },
  { href: "/lab/how-it-works/", label: "이용 방법" },
  { href: "/lab/coverage/", label: "지원 범위" },
] as const;

export const policyRoutes = [
  { href: "/privacy/", label: "개인정보처리방침" },
  { href: "/terms/", label: "이용약관" },
  { href: "/support/", label: "지원" },
  { href: "/account-deletion/", label: "계정 삭제 안내" },
] as const;

export const internalFoundationPathPrefixes = [
  "/lab",
  "/essay-lab",
  "/my",
  "/score-analysis",
  "/login",
] as const;

export const publicReleasePaths = publicReleaseRoutes.map((route) => route.href);
