import {it,expect,vi,afterEach} from 'vitest';
import {generateKeyPair,exportJWK} from 'jose';
import {FinanceVault} from './worker';
afterEach(()=>vi.unstubAllGlobals());
async function fixture(){
 const pair=await generateKeyPair('ES256',{extractable:true});const pub={...await exportJWK(pair.publicKey),kid:'test'};
 const env={FINANCE_SIGNING_JWK:JSON.stringify({...await exportJWK(pair.privateKey),kid:'test'}),FINANCE_SUBJECT:'11111111-1111-4111-8111-111111111111',FINANCE_PUBLISHABLE_KEY:'public',FINANCE_STORAGE_KEY:Buffer.alloc(32,7).toString('base64'),FINANCE_VAULT:{idFromName:()=>'',get:()=>({fetch:async()=>new Response()})}};
 let stored:unknown;const alarms:number[]=[];
 const storage={get:async<T>()=>stored as T|undefined,put:async(_k:string,v:unknown)=>{stored=structuredClone(v);},setAlarm:async(t:number)=>{alarms.push(t);}};
 const io=vi.fn(async(url:RequestInfo|URL)=>String(url).endsWith('jwks.json')?Response.json({keys:[pub]}):Response.json({code:'PT404'},{status:404}));vi.stubGlobal('fetch',io);
 return {env,storage,alarms,io,vault:new FinanceVault({storage},env),get stored(){return stored;}};
}
const req=(path='/token',body='{}',method='POST')=>new Request('https://finance.internal'+path,{method,body:method==='POST'?body:undefined});
it('encrypted persistence restores token after cold start without signing again',async()=>{const f=await fixture();const first=await(await f.vault.fetch(req())).json();expect(first.credential.token).toBeTruthy();expect(JSON.stringify(f.stored)).not.toContain(first.credential.token);expect(JSON.stringify(f.stored)).not.toContain('essay_finance');const restarted=new FinanceVault({storage:f.storage},f.env);const second=await(await restarted.fetch(req())).json();expect(second.credential.token).toBe(first.credential.token);expect(f.io).toHaveBeenCalledTimes(2);expect(f.alarms.length).toBeGreaterThan(0);});
it('status never returns stored credential',async()=>{const f=await fixture();await f.vault.fetch(req());const r=await f.vault.fetch(req('/status'));expect(await r.json()).toEqual({status:expect.objectContaining({automatic:true,healthy:true})});});
it.each([['/token','{"role":"service_role"}','POST'],['/token','{}','GET'],['/other','{}','POST'],['/token','{"rejected":"token-not-a-hash"}','POST']])('blocks unallowed request %s %s %s',async(path,body,method)=>{const f=await fixture();expect((await f.vault.fetch(req(path,body,method))).status).toBe(403);expect(f.io).not.toHaveBeenCalled();});
it('40 callers share single persisted candidate',async()=>{const f=await fixture();const replies=await Promise.all(Array.from({length:40},()=>f.vault.fetch(req()).then(r=>r.json())));expect(new Set(replies.map(r=>r.credential.token)).size).toBe(1);expect(f.io).toHaveBeenCalledTimes(2);});
it('wrong storage key fails closed without plaintext logs',async()=>{const f=await fixture();await f.vault.fetch(req());const log=vi.spyOn(console,'error').mockImplementation(()=>{});try{const broken=new FinanceVault({storage:f.storage},{...f.env,FINANCE_STORAGE_KEY:Buffer.alloc(32,8).toString('base64')});expect((await broken.fetch(req())).status).toBe(503);expect(log.mock.calls.flat().join()).toContain('VAULT_UNAVAILABLE');expect(log.mock.calls.flat().join()).not.toContain('eyJ');}finally{log.mockRestore();}});
