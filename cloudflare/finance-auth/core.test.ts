import {describe,it,expect,vi} from 'vitest';
import {Renewal,TTL,RENEW_BEFORE,type State,type Credential} from './core';
function setup(initial?:State){
 let now=1000000;let state=initial;let calls=0;let fail=false;
 const alarms:number[]=[];const alerts=vi.fn();
 const store={load:async()=>structuredClone(state),save:async(s:State)=>{state=structuredClone(s);},alarm:async(at:number)=>{alarms.push(at);}};
 const deps={now:()=>now,issue:async():Promise<Credential>=>{calls++;if(fail)throw Error('SECRET never log');return {token:'token'+calls,issued:now,expires:now+TTL,fingerprint:'hash'+calls};},probe:vi.fn(async()=>{}),alert:alerts};
 const renewal=new Renewal(store,deps);
 return {renewal,store,deps,alarms,alerts,get state(){return state!;},get calls(){return calls;},time:(v:number)=>now=v,fail:(v=true)=>fail=v};
}
const initial=():State=>({active:{token:'old',issued:1000000-10,expires:1000000-10+TTL,fingerprint:'oldhash'},failures:0,retryAt:0});
describe('serialized renewal and recovery',()=>{
 it('uses valid current credential without signing',async()=>{const f=setup(initial());expect((await f.renewal.run()).credential?.token).toBe('old');expect(f.calls).toBe(0);});
 it('renews at 20% lifetime and keeps previous',async()=>{const f=setup(initial());f.time(f.state.active!.expires-RENEW_BEFORE);await f.renewal.run();expect(f.calls).toBe(1);expect(f.state.previous?.token).toBe('old');expect(f.deps.probe).toHaveBeenCalledOnce();});
 it('expired token is replaced only after read probe',async()=>{const f=setup(initial());f.time(f.state.active!.expires+1);expect((await f.renewal.run()).credential?.token).toBe('token1');});
 it('failed renewal retains valid token and backs off',async()=>{const f=setup(initial());f.time(f.state.active!.expires-RENEW_BEFORE);f.fail();const a=await f.renewal.run();expect(a.credential?.token).toBe('old');expect(a.status.warning).toBe(true);await f.renewal.run();expect(f.calls).toBe(1);f.time(f.state.retryAt);f.fail(false);await f.renewal.run();expect(f.calls).toBe(2);expect(f.state.failures).toBe(0);});
 it('expired + failed renewal returns no credential',async()=>{const f=setup(initial());f.time(f.state.active!.expires+1);f.fail();expect((await f.renewal.run()).credential).toBeUndefined();});
 it('same rejected fingerprint concurrent requests issue once',async()=>{const f=setup(initial());const r=await Promise.all(Array.from({length:40},()=>f.renewal.run('oldhash')));expect(f.calls).toBe(1);expect(new Set(r.map(x=>x.credential?.token)).size).toBe(1);});
 it('rejecting an obsolete token does not revoke current token',async()=>{const f=setup(initial());await f.renewal.run('not-current');expect(f.calls).toBe(0);});
 it('failed validation never swaps or returns rejected token',async()=>{const f=setup(initial());f.deps.probe.mockRejectedValue(Error('PROBE_PGRST303'));const r=await f.renewal.run('oldhash');expect(r.credential).toBeUndefined();expect(f.state.active?.token).toBe('old');expect(r.status.lastError).toBe('PROBE_PGRST303');});
 it('restart reloads persisted valid token without issue',async()=>{const f=setup();await f.renewal.run();const restarted=new Renewal(f.store,f.deps);expect((await restarted.run()).credential?.token).toBe('token1');expect(f.calls).toBe(1);});
 it('bounded retry delays survive restart',async()=>{const f=setup();f.fail();await f.renewal.run();const next=new Renewal(f.store,f.deps);await next.run();expect(f.calls).toBe(1);f.time(f.state.retryAt);await next.run();expect(f.state.retryAt-f.state.lastFailure!).toBe(300);});
 it('status and warnings omit tokens and raw exceptions',async()=>{const f=setup();f.fail();const r=await f.renewal.run(undefined,true);expect(JSON.stringify(r)).not.toMatch(/SECRET|token1/);expect(r.status.lastError).toBe('RENEWAL_FAILED');expect(f.alerts).toHaveBeenCalled();});
 it('storage failure does not publish candidate and alarm already exists',async()=>{const f=setup();f.store.save=async()=>{throw Error('write failed');};await expect(f.renewal.run()).rejects.toThrow();expect(f.alarms.length).toBeGreaterThan(0);});
 it('network/probe failure preserves current and schedules retry',async()=>{const f=setup(initial());f.time(f.state.active!.expires-10);f.deps.probe.mockRejectedValue(Error('PROBE_UNAVAILABLE'));const r=await f.renewal.run();expect(r.credential).toBeUndefined();expect(f.state.active?.token).toBe('old');expect(f.alarms.at(-1)).toBe(f.state.retryAt*1000);});
});
it('periodic read health detects revoked token and stops returning it',async()=>{const f=setup(initial());f.deps.probe.mockRejectedValue(Error('PROBE_401'));const r=await f.renewal.run(undefined,true);expect(r.status).toMatchObject({healthy:false,warning:true,lastError:'PROBE_401'});expect(f.state.active?.token).toBe('old');expect((await f.renewal.run()).credential).toBeUndefined();});
it('periodic network failure warns but preserves valid token',async()=>{const f=setup(initial());f.deps.probe.mockRejectedValue(Error('PROBE_UNAVAILABLE'));const r=await f.renewal.run(undefined,true);expect(r.status).toMatchObject({healthy:true,warning:true});expect((await f.renewal.run()).credential?.token).toBe('old');});
