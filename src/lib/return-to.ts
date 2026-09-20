export function getSafeReturnPath(candidate: string | null | undefined, fallback = "/home/"): string {
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
