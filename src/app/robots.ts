import type { MetadataRoute } from "next";

import { brand } from "@/lib/brand";
import { internalFoundationPathPrefixes } from "@/lib/release-routes";

export default function robots(): MetadataRoute.Robots {
  if (!brand.siteUrl) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...internalFoundationPathPrefixes],
    },
    sitemap: new URL("/sitemap.xml", brand.siteUrl).toString(),
  };
}
