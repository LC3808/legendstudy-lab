import {expect,it,vi} from 'vitest';
import {summarizeRecords,mathRead,type RecordItem} from './essay-dashboard';
import type {SupabaseClient} from '@supabase/supabase-js';
const row=(id:string,rewrite=false,status='completed',valid=true):RecordItem=>({id,source:'essay',question:'문제',university:null,at:'2026-10-09',rewrite,evaluations:[{id:'e'+id,status,valid,at:'2026-10-09',completedAt:'2026-10-09'}]});
it('counts distinct evaluated answers, not retries, and excludes invalidated/failed evaluations',()=>{
 const a=row('a');a.evaluations.push({...a.evaluations[0],id:'retry'});
 expect(summarizeRecords([a,row('b',true),row('c',true,'failed'),row('d',false,'completed',false)])).toEqual({evaluated:2,rewritten:2,reevaluated:1,latest:'2026-10-09'});
});
it('does not manufacture completion timestamps for Math',()=>{
 const r=row('m');r.source='math';r.evaluations[0].completedAt=null;
 expect(summarizeRecords([r]).latest).toBeNull();
});
it('guards owner before and after Math RPC and validates envelope',async()=>{
 let owner='a';const rpc=vi.fn().mockImplementation(async()=>{owner='b';return {dto_version:'math-input-v1',action:'history',result:{attempts:[]}}});
 const c={auth:{getSession:async()=>({data:{session:{user:{id:owner}}}})},rpc} as unknown as SupabaseClient;
 await expect(mathRead(c,'a','history',{limit:50})).rejects.toThrow('ACCOUNT_CHANGED');
 rpc.mockClear();await expect(mathRead(c,'a','history',{})).rejects.toThrow('ACCOUNT_CHANGED');expect(rpc).not.toHaveBeenCalled();
});
it('propagates RPC failure rather than manufacturing empty history',async()=>{
 const c={auth:{getSession:async()=>({data:{session:{user:{id:'a'}}}})},rpc:async()=>({error:{code:'denied'},data:null})} as unknown as SupabaseClient;
 await expect(mathRead(c,'a','history',{})).rejects.toThrow('READ_FAILED');
});
