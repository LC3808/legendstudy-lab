import type { MetadataRoute } from "next";

import { brand } from "@/lib/brand";
import { indexablePublicPaths, internalFoundationPathPrefixes } from "@/lib/release-routes";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (!brand.siteUrl) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      /**
       * The public documents are listed as explicit allow rules because the
       * `/lab` disallow prefix also covers the public `/lab/how-it-works/` and
       * `/lab/coverage/` pages. RFC 9309 resolves an allow/disallow conflict by
       * the longest matching rule, so naming each public path lets it win while
       * the essay, auth, and My foundation routes stay disallowed.
       */
      allow: [...indexablePublicPaths],
      disallow: [...internalFoundationPathPrefixes],
    },
    sitemap: new URL("/sitemap.xml", brand.siteUrl).toString(),
  };
}