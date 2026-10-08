import {describe,expect,it,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {parseApplications,parseEvents,parseStudy,readStudy,readApplications,addApplicationEvent,studyMinutes} from './foundation';
const study={version:'study-summary-v1',as_of:'2026-10-08T10:00:00Z',timezone:'Asia/Seoul',unit:'milliseconds',source:'completed_synced_sessions',record_count:0,today_ms:0,week_ms:0,last30_ms:0,daily7:Array.from({length:7},(_,i)=>({date:`2026-10-0${i+2}`,milliseconds:0}))};
const page={version:'applications-v1',offset:0,has_more:false,items:[]};
function client(data:unknown,error:unknown=null){return {auth:{getSession:vi.fn().mockResolvedValue({data:{session:{user:{id:'a'}}}})},rpc:vi.fn().mockResolvedValue({data,error})};}
describe('shared foundation adapters',()=>{
 it('keeps real empty distinct from malformed/error responses',async()=>{
  expect(parseStudy(study).last30_ms).toBe(0);expect(parseApplications(page).items).toEqual([]);
  expect(()=>parseStudy({...study,today_ms:null})).toThrow();expect(()=>parseApplications({...page,items:null})).toThrow();
  expect(()=>parseStudy({...study,daily7:[]})).toThrow();expect(()=>parseStudy({...study,timezone:'UTC'})).toThrow();
  const c=client(null,{code:'PGRST202'});await expect(readStudy(c as unknown as SupabaseClient,'a')).rejects.toThrow('REQUEST_FAILED');
 });
 it('rejects impossible totals instead of showing fabricated metrics',()=>{
  expect(()=>parseStudy({...study,today_ms:60000})).toThrow();expect(()=>parseStudy({...study,last30_ms:-1})).toThrow();
  expect(studyMinutes(119999)).toBe(1);
 });
 it('uses self RPC without client supplied user ID',async()=>{
  const c=client(page);await readApplications(c as unknown as SupabaseClient,'a');expect(c.rpc).toHaveBeenCalledWith('my_applications',{p_offset:0});
 });
 it('rejects both pre-call and in-flight account switches',async()=>{
  const c=client(study);await expect(readStudy(c as unknown as SupabaseClient,'b')).rejects.toThrow('ACCOUNT_CHANGED');expect(c.rpc).not.toHaveBeenCalled();
  c.auth.getSession.mockResolvedValueOnce({data:{session:{user:{id:'a'}}}}).mockResolvedValueOnce({data:{session:{user:{id:'b'}}}});
  await expect(readStudy(c as unknown as SupabaseClient,'a')).rejects.toThrow('ACCOUNT_CHANGED');
 });
 it('passes correction identity and stable request key without ledger or target writes',async()=>{
  const c=client('event-id');await addApplicationEvent(c as unknown as SupabaseClient,'a','app-id','accepted',null,'older-event','request-key');
  expect(c.rpc).toHaveBeenCalledWith('my_application_event',{p_id:'app-id',p_kind:'accepted',p_occurred_at:null,p_supersedes:'older-event',p_request_key:'request-key'});
 });
 it('retains event chronology and correction relation',()=>{
  const e={id:'new',kind:'rejected',recorded_at:'2026-10-08T10:00:00Z',occurred_at:'2026-10-07T10:00:00Z',supersedes_event_id:'old'};
  expect(parseEvents({version:'application-events-v1',offset:0,has_more:false,items:[e]}).items[0]).toEqual(e);
 });
});
