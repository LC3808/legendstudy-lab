/** Server-only configuration diagnosis. Never returns credentials or claim values. */
export type RegistryCredentialIssue = 'MISSING'|'FORMAT'|'ALGORITHM'|'ROLE'|'EXPIRY_INVALID'|'EXPIRED'|'EXPIRING'|'NOT_BEFORE'|null;
export function registryCredentialIssue(value:string|undefined,now=Date.now()):RegistryCredentialIssue {
 if(!value)return 'MISSING';
 if(value.length>16384||/\s/.test(value))return 'FORMAT';
 const parts=value.split('.');
 if(parts.length!==3||parts.some(part=>!/^[A-Za-z0-9_-]+$/.test(part)))return 'FORMAT';
 try {
  const decode=(part:string)=>JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));
  const header=decode(parts[0]),claims=decode(parts[1]);
  if(!['HS256','ES256','RS256'].includes(header?.alg))return 'ALGORITHM';
  if(claims?.role!=='essay_worker')return 'ROLE';
  if(!Number.isSafeInteger(claims.exp))return 'EXPIRY_INVALID';
  if(claims.exp*1000<=now)return 'EXPIRED';
  if(claims.exp*1000<=now+60000)return 'EXPIRING';
  if(claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf*1000>now))return 'NOT_BEFORE';
  return null;
 }catch{return 'FORMAT';}
}
/** Preflight only; Supabase still verifies signature and ACL. No student authorization. */
export function registryWorkerCredential(value:string|undefined,now=Date.now()):string|null {
 return registryCredentialIssue(value,now)===null?value!:null;
}
