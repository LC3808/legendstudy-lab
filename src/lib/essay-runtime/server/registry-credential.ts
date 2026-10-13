/** Configuration preflight only. Supabase must still verify the signature and ACL.
 * No JWT claims are used to authorize a student, and no token is logged/returned.
 */
export function registryWorkerCredential(value: string | undefined, now = Date.now()): string | null {
  if (!value || value.length > 16384 || /\s/.test(value)) return null;
  const parts = value.split('.');
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  try {
    const decode = (part: string) => JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    const header = decode(parts[0]);
    const claims = decode(parts[1]);
    if (!['HS256', 'ES256', 'RS256'].includes(header?.alg) || claims?.role !== 'essay_worker' ||
        !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= now + 60000 ||
        (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf * 1000 > now))) return null;
    return value;
  } catch { return null; }
}
