import {describe,it,expect,vi} from 'vitest';
import {parseWithdrawalDetail,parseWithdrawalList,withdrawalDefaults} from './withdrawals';
import {createAdminClient} from './client';
import {requestId,row,listFixture,detailFixture} from '@/test/withdrawal-fixtures';
const session={auth:{getSession:async()=>({data:{session:{access_token:'synthetic-token'}}})}};
describe('withdrawal read contract',()=>{
 it('preserves zero, unknown and missing data separately',()=>{
  expect(parseWithdrawalList(listFixture).kpis.completed30).toBe(0);
  expect(parseWithdrawalList({...listFixture,kpis:{...listFixture.kpis,completed30:null}}).kpis.completed30).toBeNull();
  expect(parseWithdrawalDetail(detailFixture).activity?.material_views).toBeNull();
 });
 for(const change of [{total:-1},{limit:0},{items:null},{items:[row,row],total:2},{items:[{...row,state:'BAD'}]},{items:[{...row,requested_at:'invalid'}]},{items:[{...row,status:'BAD'}]},{items:[{...row,state:'ERASED'}]}]){
  it(`rejects malformed list ${JSON.stringify(change)}`,()=>expect(()=>parseWithdrawalList({...listFixture,...change})).toThrow());
 }
 for(const change of [{activity:{...detailFixture.activity,study_ms:-1}},{error:'SQL contains secret'},{identity:{...detailFixture.identity,school_set:null}},{state:'ERASED'},{state:'ERASING'},{activity:undefined}]){
  it(`rejects malformed or retained private detail ${JSON.stringify(change).slice(0,80)}`,()=>expect(()=>parseWithdrawalDetail({...detailFixture,...change})).toThrow());
 }
 it('accepts erased audit without reconstructing identity',()=>expect(parseWithdrawalDetail({...detailFixture,state:'ERASED',identity:null,activity:null}).identity).toBeNull());
 it('uses existing signed session and sends only bounded read arguments',async()=>{
  const rpc=vi.fn(async()=>({data:listFixture,error:null}));
  const client=createAdminClient({...session,rpc} as never);
  await client.withdrawals({...withdrawalDefaults,status:'pending'},{limit:10,offset:20});
  expect(rpc).toHaveBeenCalledWith('admin_withdrawal_list',{p_query:'',p_status:'pending',p_sort:'newest',p_limit:10,p_offset:20,p_cursor:null});
 });
 it('rejects mismatched detail identities from a stale/corrupt result',async()=>{
  const client=createAdminClient({...session,rpc:async()=>({data:{...detailFixture,request_id:'10000000-0000-0000-0000-000000000002'},error:null})} as never);
  await expect(client.withdrawalDetail(requestId)).rejects.toMatchObject({kind:'MALFORMED_RESPONSE'});
 });
 it('does not call RPC without a session',async()=>{
  const rpc=vi.fn();const client=createAdminClient({auth:{getSession:async()=>({data:{session:null}})},rpc} as never);
  await expect(client.withdrawals(withdrawalDefaults)).rejects.toMatchObject({kind:'UNAUTHENTICATED'});expect(rpc).not.toHaveBeenCalled();
 });
 for(const [code,kind] of [['42501','UNAUTHORIZED'],['PGRST202','NOT_INSTALLED'],['PT404','NOT_FOUND']]){
  it(`keeps ${kind} distinct from empty`,async()=>{
   const client=createAdminClient({...session,rpc:async()=>({data:null,error:{code}})} as never);
   await expect(client.withdrawals(withdrawalDefaults)).rejects.toMatchObject({kind});
  });
 }
});
