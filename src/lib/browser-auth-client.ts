import "client-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getBrowserAuthConfig } from "@/lib/auth-config";

let browserClient: SupabaseClient | null | undefined;

/**
 * This is intentionally browser-only. It receives only the Supabase public
 * project URL and publishable key; service-role credentials never enter this
 * project or the client bundle.
 */
export function getBrowserAuthClient(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;

  const config = getBrowserAuthConfig();
  if (!config) {
    browserClient = null;
    return browserClient;
  }

  browserClient = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
      persistSession: true,
      storageKey: "legendstudy-lab-auth",
    },
  });

  return browserClient;
}
