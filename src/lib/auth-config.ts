export const legendStudySupabaseUrl = "https://stlhijzpjfgwwdgunlsd.supabase.co";

export const supportedSocialProviders = ["google", "apple", "kakao"] as const;
export type SocialProvider = (typeof supportedSocialProviders)[number];

type AuthEnvironment = {
  url?: string;
  publishableKey?: string;
  providers?: string;
};

export type BrowserAuthConfig = {
  url: string;
  publishableKey: string;
  socialProviders: SocialProvider[];
};

function parseProviders(value: string | undefined): SocialProvider[] {
  if (!value) return [];

  const allowed = new Set<string>(supportedSocialProviders);
  const selected = value
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider): provider is SocialProvider => allowed.has(provider));

  return [...new Set(selected)];
}

/**
 * Only the LegendStudy app's declared public project URL is accepted. This
 * prevents a mistakenly configured LAB deployment from pointing at another
 * Supabase project while keeping all browser configuration non-secret.
 */
export function getBrowserAuthConfig(
  environment: AuthEnvironment = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    providers: process.env.NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS,
  },
): BrowserAuthConfig | null {
  const url = environment.url?.trim().replace(/\/$/, "");
  const publishableKey = environment.publishableKey?.trim();

  if (url !== legendStudySupabaseUrl || !publishableKey || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    return null;
  }

  return {
    url,
    publishableKey,
    socialProviders: parseProviders(environment.providers),
  };
}

export function browserRedirectTo(pathname: string): string {
  return new URL(pathname, window.location.origin).toString();
}
