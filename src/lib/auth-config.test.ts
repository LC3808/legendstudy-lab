import { describe, expect, it } from "vitest";

import { getBrowserAuthConfig, legendStudySupabaseUrl } from "./auth-config";

describe("getBrowserAuthConfig", () => {
  const publishableKey = "sb_publishable_unit_test_key";

  it("accepts only the declared LegendStudy Supabase public project", () => {
    expect(getBrowserAuthConfig({
      url: `${legendStudySupabaseUrl}/`,
      publishableKey,
      providers: "google, kakao, google, unsupported",
    }, "https://lab.legendstudy.com")).toEqual({
      url: legendStudySupabaseUrl,
      publishableKey,
      socialProviders: ["google", "kakao"],
    });
  });

  it("fails closed when any public configuration value is absent or points elsewhere", () => {
    expect(getBrowserAuthConfig({ url: legendStudySupabaseUrl }, "https://lab.legendstudy.com")).toBeNull();
    expect(getBrowserAuthConfig({ url: "https://another-project.supabase.co", publishableKey }, "https://lab.legendstudy.com")).toBeNull();
    expect(getBrowserAuthConfig({ url: legendStudySupabaseUrl, publishableKey: "service-role-value" }, "https://lab.legendstudy.com")).toBeNull();
  });
});

const preview = { url: "https://synthetictest.supabase.co", publishableKey: "sb_publishable_synthetic", approvedPreviewOrigin: "https://payment-test.example.pages.dev", approvedPreviewSupabaseUrl: "https://synthetictest.supabase.co" };
it("admits only the build-approved Preview pair", () => {
  expect(getBrowserAuthConfig(preview, preview.approvedPreviewOrigin)?.url).toBe(preview.url);
  for (const origin of [undefined, "https://lab.legendstudy.com", "https://evil.pages.dev", "http://payment-test.example.pages.dev"]) expect(getBrowserAuthConfig(preview, origin)).toBeNull();
  expect(getBrowserAuthConfig({...preview, url: legendStudySupabaseUrl}, preview.approvedPreviewOrigin)).toBeNull();
  expect(getBrowserAuthConfig({...preview, approvedPreviewSupabaseUrl: legendStudySupabaseUrl, url: legendStudySupabaseUrl}, preview.approvedPreviewOrigin)).toBeNull();
  expect(getBrowserAuthConfig({...preview, approvedPreviewOrigin: undefined}, preview.approvedPreviewOrigin)).toBeNull();
});
