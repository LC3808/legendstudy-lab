/** No signing material in Pages. The private service owns issuance and storage. */
import { decodeJwt, decodeProtectedHeader } from 'jose';
import { fingerprint, ISSUER, DB, probe } from './finance-auth/credential';
import { MIN_VALIDITY, TTL, type Status } from './finance-auth/core';
export type FinanceEnv = { PAYMENT_SUPABASE_PUBLISHABLE_KEY?:string; PAYMENT_FINANCE_TOKEN?:string; PAYMENT_FINANCE_AUTO?:string; FINANCE_AUTH?:{fetch(request:Request):Promise<Response>} };
function expiry(token:string):number {
  try { const p=decodeJwt(token),h=decodeProtectedHeader(token);if(h.alg!=='ES256'||p.role!=='essay_finance'||p.iss!==ISSUER||p.aud!=='authenticated'||typeof p.sub!=='string'||!p.exp||!p.iat||p.exp-p.iat!==TTL)return 0;return p.exp; } catch {return 0;}
}
async function broker(env:FinanceEnv,path:string,rejected?:string):Promise<Record<string,unknown>> {
  if(!env.FINANCE_AUTH)throw Error('FINANCE_AUTH_UNAVAILABLE');
  // A local deadline also bounds mock/service transports that ignore AbortSignal.
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    const r=await Promise.race([env.FINANCE_AUTH.fetch(new Request('https://finance.internal/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rejected?{rejected}:{}),signal:AbortSignal.timeout(25000)})),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('FINANCE_AUTH_UNAVAILABLE')),25000);})]);
    if(!r.ok)throw Error('FINANCE_AUTH_UNAVAILABLE');
    return await r.json() as Record<string,unknown>;
  } finally {if(timer)clearTimeout(timer);}
}
export async function financeToken(env:FinanceEnv,rejectedToken?:string):Promise<string> {
  if(env.PAYMENT_FINANCE_AUTO!=='true')return env.PAYMENT_FINANCE_TOKEN||'';
  try {
    const r=await broker(env,'token',rejectedToken?await fingerprint(rejectedToken):undefined);
    const c=r.credential as {token?:unknown}|undefined;
    if(typeof c?.token==='string'&&c.token!==rejectedToken&&expiry(c.token)>Date.now()/1000+MIN_VALIDITY)return c.token;
  } catch { /* use only an unexpired, non-rejected old secret */ }
  const old=env.PAYMENT_FINANCE_TOKEN;
  if(old&&old!==rejectedToken&&expiry(old)>Date.now()/1000+MIN_VALIDITY)return old;
  throw Error('FINANCE_AUTH_UNAVAILABLE');
}
/** Reconstruct an allowlisted status; never forward a service response to a browser. */
export async function financeStatus(env:FinanceEnv,io:typeof fetch=fetch):Promise<Record<string,unknown>> {
  const exp=expiry(env.PAYMENT_FINANCE_TOKEN||'');
  const base={automatic:env.PAYMENT_FINANCE_AUTO==='true',healthy:exp>Date.now()/1000+MIN_VALIDITY,expiresAt:exp||null,remainingSeconds:Math.max(0,Math.floor(exp-Date.now()/1000)),lastSuccess:null,lastFailure:null,lastError:null,retryAt:0,checkedAt:null,warning:true,source:'manual'};
  const manual=async()=>{
    if(!base.healthy||!env.PAYMENT_SUPABASE_PUBLISHABLE_KEY)return {...base,healthy:false};
    try {await probe(env.PAYMENT_FINANCE_TOKEN!,env.PAYMENT_SUPABASE_PUBLISHABLE_KEY,io);return base;}
    catch {return {...base,healthy:false,lastError:'MANUAL_PROBE_FAILED'};}
  };
  if(!['true','shadow'].includes(env.PAYMENT_FINANCE_AUTO||''))return manual();
  try {
    const r=await broker(env,'status'),s=r.status as Status;
    if(!s||s.automatic!==true)throw Error();
    const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
    const errors=['SIGNER_INVALID','CANDIDATE_INVALID','PROBE_401','PROBE_403','PROBE_PGRST303','PROBE_UNAVAILABLE','PROBE_REJECTED','RENEWAL_FAILED','JWT_REJECTED'];
    return {automatic:env.PAYMENT_FINANCE_AUTO==='true',healthy:s.healthy===true,expiresAt:n(s.expiresAt),remainingSeconds:n(s.remainingSeconds),lastSuccess:n(s.lastSuccess),lastFailure:n(s.lastFailure),lastError:errors.includes(String(s.lastError))?s.lastError:null,retryAt:n(s.retryAt),checkedAt:n(s.checkedAt),warning:s.warning!==false,source:env.PAYMENT_FINANCE_AUTO==='shadow'?'shadow':'automatic'};
  } catch { return {...await manual(),source:'fallback',lastError:'BROKER_UNAVAILABLE'}; }
}
export async function financeFetch(env:FinanceEnv,io:typeof fetch,url:string,init:RequestInit):Promise<Response> {
  if(env.PAYMENT_FINANCE_AUTO==='true'&&!['payment_process','payment_support','payment_compensate'].some(name=>url===DB+'/rest/v1/rpc/'+name))throw Error('FINANCE_DESTINATION_DENIED');
  let token=await financeToken(env);
  const send=()=>{const headers=new Headers(init.headers);headers.set('Authorization','Bearer '+token);return io(url,{...init,headers,redirect:'manual',signal:AbortSignal.timeout(10000)});};
  let r=await send();
  if(env.PAYMENT_FINANCE_AUTO==='true'&&r.status===401){
    const error=await r.clone().json().catch(()=>({})) as {code?:string};
    // Only a PostgREST pre-execution JWT rejection permits one exact-body replay.
    // Never retry an ambiguous timeout, 5xx, business error, provider call or 403.
    console.warn(JSON.stringify({event:'finance_rpc_auth_error',status:401,code:['PGRST301','PGRST303','PT401'].includes(error.code||'')?error.code:'UNCLASSIFIED'}));
    if(['PGRST301','PGRST303'].includes(error.code||'')){
      token=await financeToken(env,token);r=await send();
    }
  }
  return r;
}
