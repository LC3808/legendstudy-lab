import { describe, expect, it } from "vitest";

import { getBrowserAuthConfig, legendStudySupabaseUrl } from "./auth-config";

describe("getBrowserAuthConfig", () => {
  const publishableKey = "sb_publishable_unit_test_key";

  it("accepts only the declared LegendStudy Supabase public project", () => {
    expect(getBrowserAuthConfig({
      url: `${legendStudySupabaseUrl}/`,
      publishableKey,
      providers: "google, kakao, google, unsupported",
    })).toEqual({
      url: legendStudySupabaseUrl,
      publishableKey,
      socialProviders: ["google", "kakao"],
    });
  });

  it("fails closed when any public configuration value is absent or points elsewhere", () => {
    expect(getBrowserAuthConfig({ url: legendStudySupabaseUrl })).toBeNull();
    expect(getBrowserAuthConfig({ url: "https://another-project.supabase.co", publishableKey })).toBeNull();
    expect(getBrowserAuthConfig({ url: legendStudySupabaseUrl, publishableKey: "service-role-value" })).toBeNull();
  });
});
