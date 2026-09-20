import type { Metadata } from "next";

export const brand = {
  productName: "LegendStudy LAB",
  byline: "by 레전드스터디+",
  phaseLabel: "SERVICE PREPARING",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || undefined,
} as const;

export function buildMetadata(title: string, description: string): Metadata {
  const fullTitle = `${title} | ${brand.productName} ${brand.byline}`;
  const path = title === "LS LAB" ? "/" : undefined;
  const canonical = brand.siteUrl && path ? new URL(path, brand.siteUrl).toString() : undefined;

  return {
    title: fullTitle,
    description,
    robots: { index: false, follow: false },
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url: canonical,
      siteName: `${brand.productName} ${brand.byline}`,
    },
  };
}

type PublicMetadataOptions = {
  index?: boolean;
  canonicalOrigin?: string | false;
};

/**
 * Public-facing pages are indexable only after a Product Owner supplies the
 * final HTTPS origin at build time. This keeps temporary previews out of the
 * canonical and prevents a local foundation from claiming a public domain.
 */
export function buildPublicMetadata(
  title: string,
  description: string,
  path: string,
  { index = true, canonicalOrigin }: PublicMetadataOptions = {},
): Metadata {
  const siteUrl = canonicalOrigin === false ? undefined : (canonicalOrigin ?? brand.siteUrl);
  const canonical = siteUrl ? new URL(path, siteUrl).toString() : undefined;
  const canIndex = Boolean(canonical) && index;

  return {
    title,
    description,
    robots: { index: canIndex, follow: canIndex },
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      siteName: `${brand.productName} ${brand.byline}`,
    },
  };
}

export function publicUrl(path: string): string | undefined {
  if (!brand.siteUrl) return undefined;
  return new URL(path, brand.siteUrl).toString();
}
