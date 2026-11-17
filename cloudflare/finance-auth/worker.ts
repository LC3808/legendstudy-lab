import { Renewal, type State } from './core';
import { issue, probe, type SigningEnv } from './credential';
interface Storage { get<T>(key:string):Promise<T|undefined>; put(key:string,value:unknown):Promise<void>; setAlarm(at:number):Promise<void> }
interface Stub { fetch(request:Request):Promise<Response> }
interface Env extends SigningEnv { FINANCE_STORAGE_KEY:string; FINANCE_VAULT:{idFromName(name:string):unknown;get(id:unknown):Stub} }
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function storageKey(secret:string) {
  const bytes=Uint8Array.from(atob(secret),c=>c.charCodeAt(0));
  if(bytes.length!==32) throw Error('STORAGE_UNAVAILABLE');
  return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
export class FinanceVault {
  private renewal:Renewal;
  constructor(ctx:{storage:Storage},env:Env) {
    const storage=ctx.storage;
    this.renewal=new Renewal({
      load:async()=>{
        const saved=await storage.get<{iv:number[];cipher:number[]}>('credential-v1');
        if(!saved)return undefined;
        const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(saved.iv)},await storageKey(env.FINANCE_STORAGE_KEY),new Uint8Array(saved.cipher));
        return JSON.parse(new TextDecoder().decode(plain)) as State;
      },
      save:async s=>{
        const iv=crypto.getRandomValues(new Uint8Array(12));
        const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await storageKey(env.FINANCE_STORAGE_KEY),new TextEncoder().encode(JSON.stringify(s)));
        await storage.put('credential-v1',{iv:Array.from(iv),cipher:Array.from(new Uint8Array(cipher))});
      },alarm:at=>storage.setAlarm(at),
    },{now:()=>Math.floor(Date.now()/1000),issue:()=>issue(env),probe:token=>probe(token,env.FINANCE_PUBLISHABLE_KEY),alert:status=>console.error(JSON.stringify({event:'finance_auth_warning',...status}))});
  }
  async fetch(request:Request):Promise<Response> {
    try {
      const path=new URL(request.url).pathname;
      if(request.method!=='POST'||!['/token','/status'].includes(path))return reply({code:'DENIED'},403);
      const body=await request.text();
      if(body.length>150)return reply({code:'DENIED'},403);
      const input=JSON.parse(body||'{}') as Record<string,unknown>;
      if(Object.keys(input).some(k=>k!=='rejected')||(input.rejected!==undefined&&(typeof input.rejected!=='string'||!/^[a-f0-9]{64}$/.test(input.rejected))))return reply({code:'DENIED'},403);
      const result=await this.renewal.run(input.rejected as string|undefined,path==='/status');
      return reply(result,path==='/token'&&!result.credential?503:200);
    } catch { console.error(JSON.stringify({event:'finance_auth_warning',code:'VAULT_UNAVAILABLE'}));return reply({code:'FINANCE_AUTH_UNAVAILABLE'},503); }
  }
  async alarm():Promise<void>{await this.renewal.run(undefined,true);}
}
const worker = {
  async fetch(request:Request,env:Env):Promise<Response> {
    // No public routes/workers.dev/preview URLs. Only Production Pages service binding.
    return env.FINANCE_VAULT.get(env.FINANCE_VAULT.idFromName('production-v1')).fetch(request);
  },
  async scheduled(_event:unknown,env:Env):Promise<void> {
    const r=await env.FINANCE_VAULT.get(env.FINANCE_VAULT.idFromName('production-v1')).fetch(new Request('https://finance.internal/status',{method:'POST',body:'{}'}));
    if(!r.ok) throw Error('FINANCE_HEARTBEAT_FAILED');
  },
};

export default worker;
