import type { MetadataRoute } from "next";

import { brand } from "@/lib/brand";
import { publicReleasePaths } from "@/lib/release-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!brand.siteUrl) return [];

  const lastModified = new Date("2026-09-20T00:00:00.000Z");
  return publicReleasePaths.map((path, index) => ({
    url: new URL(path, brand.siteUrl).toString(),
    lastModified,
    changeFrequency: index === 0 ? "monthly" : "yearly",
    priority: index === 0 ? 1 : 0.7,
  }));
}
