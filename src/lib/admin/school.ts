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

export type SchoolOption = { office: string; code: string; name: string; address: string };
export async function searchSchools(query: string): Promise<SchoolOption[]> {
  const config = getBrowserAuthConfig();
  if (!config || !query.trim() || query.trim().length > 100) throw new Error("INVALID_SEARCH");
  const url = new URL(`${config.url}/functions/v1/neis`);
  url.search = new URLSearchParams({action:"search",q:query.trim()}).toString();
  const response = await fetch(url,{headers:{apikey:config.publishableKey},credentials:"omit",signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error("SEARCH_FAILED");
  const data = await response.json();
  if (!Array.isArray(data.rows)) throw new Error("INVALID_RESPONSE");
  return data.rows.filter((r: Record<string,unknown>) => r && [r.ATPT_OFCDC_SC_CODE,r.SD_SCHUL_CODE,r.SCHUL_NM].every(v=>typeof v==='string'&&v.length>0))
    .map((r: Record<string,string>)=>({office:r.ATPT_OFCDC_SC_CODE,code:r.SD_SCHUL_CODE,name:r.SCHUL_NM,address:r.ORG_RDNMA||''}));
}
