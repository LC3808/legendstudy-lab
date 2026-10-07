export function getSafeReturnPath(candidate: string | null | undefined, fallback = "/"): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://legendstudy-lab.invalid");
    if (parsed.origin !== "https://legendstudy-lab.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function appendReturnPath(pathname: string, returnPath: string): string {
  const safeReturnPath = getSafeReturnPath(returnPath);
  return `${pathname}?next=${encodeURIComponent(safeReturnPath)}`;
}

/** Auth screens cannot be their own post-login destination. Payment paths remain valid. */
export function getAuthReturnPath(candidate: string | null | undefined): string {
  const safe = getSafeReturnPath(candidate);
  try {
    const pathname = decodeURIComponent(new URL(safe, "https://legendstudy-lab.invalid").pathname);
    return /^\/(?:login|signup|forgot-password|reset-password|auth|api)(?:\/|$)/i.test(pathname) ? "/account/" : safe;
  } catch { return "/account/"; }
}
