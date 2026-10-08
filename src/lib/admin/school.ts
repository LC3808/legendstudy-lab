import { getBrowserAuthConfig } from "@/lib/auth-config";

/** APP canonical public NEIS lookup. No member identity or session is sent. */
export async function lookupSchoolName(office: string, school: string, signal: AbortSignal): Promise<string | null> {
  const config = getBrowserAuthConfig();
  if (!config) throw new Error("configuration unavailable");
  const url = new URL(`${config.url}/functions/v1/neis`);
  url.search = new URLSearchParams({ action: "school", office, school }).toString();
  const response = await fetch(url, {
    headers: { apikey: config.publishableKey }, signal,
    credentials: "omit",
  });
  if (!response.ok) throw new Error("lookup failed");
  const data: unknown = await response.json();
  const rows = data && typeof data === "object" && "rows" in data ? data.rows : null;
  const match = Array.isArray(rows) ? rows.find((row) => row &&
    row.ATPT_OFCDC_SC_CODE === office && row.SD_SCHUL_CODE === school &&
    typeof row.SCHUL_NM === "string" && row.SCHUL_NM.trim()) : null;
  return match?.SCHUL_NM ?? null;
}
