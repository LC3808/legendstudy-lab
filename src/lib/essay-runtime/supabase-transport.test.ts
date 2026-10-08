import {describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {essaySupabaseTransport} from './supabase-transport';
describe('canonical Supabase transport',()=>{
 it('preserves owner predicates, stable ordering, bounds and DB error codes',async()=>{
  const query={select:vi.fn(),eq:vi.fn(),order:vi.fn(),limit:vi.fn(async()=>({data:[{id:'session'}],error:null}))};
  for(const key of ['select','eq','order'] as const)query[key].mockReturnValue(query);
  const client={from:vi.fn(()=>query),rpc:vi.fn(async()=>({data:null,error:{code:'PT409'}}))} as unknown as SupabaseClient;
  let owner:string|null='A';const port=essaySupabaseTransport(client,()=>owner);
  expect(await port.rows('essay_practice_sessions','id',{user_id:'A'},1,'created_at.desc,id.desc')).toEqual([{id:'session'}]);
  expect(query.eq).toHaveBeenCalledWith('user_id','A');expect(query.limit).toHaveBeenCalledWith(1);expect(query.order).toHaveBeenCalledWith('id',{ascending:false});
  await expect(port.rpc('essay_save_draft',{})).rejects.toMatchObject({code:'PT409'});
  owner=null;expect(port.userId()).toBeNull();
 });
 it('cannot access a worker/finance RPC or unrelated relation through this adapter',async()=>{
  const client={rpc:vi.fn(),from:vi.fn()} as unknown as SupabaseClient;const port=essaySupabaseTransport(client,()=>null);
  await expect(port.rpc('essay_finalize_success',{})).rejects.toMatchObject({code:'UNSUPPORTED_RPC'});
  await expect(port.rows('profiles','*',{},50,'id.asc')).rejects.toMatchObject({code:'INVALID_READ'});
  await expect(port.rows('essay_evaluations','id',{},500,'id.asc')).rejects.toMatchObject({code:'INVALID_READ'});
  expect(client.rpc).not.toHaveBeenCalled();expect(client.from).not.toHaveBeenCalled();
 });
});
