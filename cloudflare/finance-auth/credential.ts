import { importJWK, SignJWT, jwtVerify, type JWK } from 'jose';
import { TTL, type Credential } from './core';
export const DB = 'https://stlhijzpjfgwwdgunlsd.supabase.co';
export const ISSUER = DB + '/auth/v1';
export type SigningEnv = { FINANCE_SIGNING_JWK: string; FINANCE_SUBJECT: string; FINANCE_PUBLISHABLE_KEY: string };
export async function fingerprint(token: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function issue(env: SigningEnv, io: typeof fetch = fetch, now = Math.floor(Date.now()/1000)): Promise<Credential> {
  let stage = "key-contract";
  try {
    const jwk = JSON.parse(env.FINANCE_SIGNING_JWK) as JWK;
    if(jwk.kty!=='EC'||jwk.crv!=='P-256'||!jwk.d||!jwk.kid||! /^[0-9a-f-]{36}$/i.test(env.FINANCE_SUBJECT)) throw Error();
    stage = "jwks-fetch";
    const response = await io(ISSUER+'/.well-known/jwks.json',{redirect:'manual',signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw Error();
    const keys = (await response.json() as {keys:JWK[]}).keys;
    stage = "jwks-match";
    const publicKey = keys.find(k=>k.kid===jwk.kid&&k.kty==='EC'&&k.crv==='P-256'&&k.x===jwk.x&&k.y===jwk.y&&!k.d);
    if(!publicKey) throw Error();
    stage = "sign";
    const token = await new SignJWT({role:'essay_finance'}).setProtectedHeader({alg:'ES256',typ:'JWT',kid:jwk.kid}).setSubject(env.FINANCE_SUBJECT).setIssuer(ISSUER).setAudience('authenticated').setIssuedAt(now).setExpirationTime(now+TTL).sign(await importJWK({kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y,d:jwk.d},'ES256'));
    stage = "verify";
    const {payload} = await jwtVerify(token,await importJWK({kty:'EC',crv:'P-256',x:publicKey.x,y:publicKey.y},'ES256'),{algorithms:['ES256'],issuer:ISSUER,audience:'authenticated',subject:env.FINANCE_SUBJECT,currentDate:new Date(now*1000)});
    if(payload.role!=='essay_finance'||payload.exp!==now+TTL) throw Error();
    return {token,issued:now,expires:now+TTL,fingerprint:await fingerprint(token)};
  } catch { console.error(JSON.stringify({event:'finance_signer_failure',stage})); throw Error('SIGNER_INVALID'); }
}
export async function probe(token: string, publishable: string, io: typeof fetch = fetch): Promise<void> {
  let response: Response;
  try { response = await io(DB+'/rest/v1/rpc/payment_process',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(8000),headers:{apikey:publishable,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p:{dto_version:'payment-v1',action:'get',id:'00000000-0000-0000-0000-000000000000'}})}); }
  catch { throw Error('PROBE_UNAVAILABLE'); }
  const body = await response.json().catch(()=>({})) as {code?:string};
  if(response.status===404&&body.code==='PT404') return;
  if(body.code==='PGRST303') throw Error('PROBE_PGRST303');
  if(response.status===401||response.status===403) throw Error('PROBE_'+response.status);
  throw Error('PROBE_REJECTED');
}
