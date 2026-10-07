export const legendStudySupabaseUrl = "https://stlhijzpjfgwwdgunlsd.supabase.co";

export const supportedSocialProviders = ["google", "apple", "kakao"] as const;
export type SocialProvider = (typeof supportedSocialProviders)[number];

type AuthEnvironment = {
  url?: string;
  publishableKey?: string;
  providers?: string;
  approvedPreviewOrigin?: string;
  approvedPreviewSupabaseUrl?: string;
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
 * The build declares one exact Preview origin/project pair. Location only checks
 * that declaration; query strings, storage and callers cannot choose a project.
 * Production is permanently bound to its existing project. Missing config closes auth.
 */
export function getBrowserAuthConfig(
  environment: AuthEnvironment = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    providers: process.env.NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS,
    approvedPreviewOrigin: process.env.NEXT_PUBLIC_AUTH_PREVIEW_ORIGIN,
    approvedPreviewSupabaseUrl: process.env.NEXT_PUBLIC_AUTH_PREVIEW_SUPABASE_URL,
  },
  origin: string | undefined = typeof window === "undefined" ? undefined : window.location.origin,
): BrowserAuthConfig | null {
  const url = environment.url?.trim().replace(/\/$/, "");
  const publishableKey = environment.publishableKey?.trim();

  const production = origin === "https://lab.legendstudy.com" && url === legendStudySupabaseUrl;
  const previewOrigin = environment.approvedPreviewOrigin;
  const previewUrl = environment.approvedPreviewSupabaseUrl;
  const preview = !!previewOrigin && /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pages\.dev$/.test(previewOrigin)
    && origin === previewOrigin && !!previewUrl
    && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(previewUrl)
    && previewUrl !== legendStudySupabaseUrl && url === previewUrl;

  if ((!production && !preview) || !publishableKey || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
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
