import {describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {historyRows,saveMajor,editTarget,readGoals} from './data';
const at='2026-10-07T10:00:00Z';
describe('canonical credit history',()=>{
 it('counts multi-grant consumption once, excludes reserve/release and shows included evaluation as zero',()=>{
  const tx=[{id:'r',decision_id:'d',transaction_type:'reserve',balance_delta:0,created_at:at},{id:'c1',decision_id:'d',transaction_type:'consume',balance_delta:-1,created_at:at},{id:'c2',decision_id:'d',transaction_type:'consume',balance_delta:-2,created_at:at},{id:'release',decision_id:'f',transaction_type:'release',balance_delta:0,created_at:at}];
  const rows=historyRows(tx,[{id:'included',credits_required:0,status:'settled',created_at:at},{id:'unsettled',credits_required:0,status:'reserved',created_at:at}]);
  expect(rows).toHaveLength(2);expect(rows.find(r=>r.id==='d')?.delta).toBe(-3);expect(rows.find(r=>r.id==='included')?.delta).toBe(0);
 });
 it('preserves positive refunds and grants as separate ledger facts',()=>{
  expect(historyRows([{id:'g',decision_id:null,transaction_type:'signup_bonus',balance_delta:3,created_at:at},{id:'f',decision_id:'d',transaction_type:'refund',balance_delta:1,created_at:at}],[]).map(r=>r.delta)).toEqual([3,1]);
 });
});
function fixture(user='owner'){
 const q={update:vi.fn(),delete:vi.fn(),select:vi.fn(),eq:vi.fn(),order:vi.fn(),limit:vi.fn(),single:vi.fn(),maybeSingle:vi.fn()};
 for(const f of Object.values(q))f.mockReturnValue(q);
 q.single.mockResolvedValue({data:{id:'row'},error:null});q.maybeSingle.mockResolvedValue({data:{intended_major:'공학'},error:null});q.limit.mockResolvedValue({data:[],error:null});
 const from=vi.fn(()=>q);const client={from,auth:{getSession:vi.fn().mockResolvedValue({data:{session:{user:{id:user}}}})}} as unknown as SupabaseClient;
 return {client,from,q};
}
it('does not query or mutate after the session owner changes',async()=>{
 const {client,from}=fixture('other');await expect(saveMajor(client,'owner','공학')).rejects.toThrow('ACCOUNT_CHANGED');expect(from).not.toHaveBeenCalled();
});
it('edits only the canonical owner profile with a constrained interest field',async()=>{
 const {client,from,q}=fixture();await saveMajor(client,'owner','공학');expect(from).toHaveBeenCalledWith('profiles');expect(q.update).toHaveBeenCalledWith({intended_major:'공학'});expect(q.eq).toHaveBeenCalledWith('id','owner');await expect(saveMajor(client,'owner','arbitrary')).rejects.toThrow('INVALID_MAJOR');
});
it('keeps university division separate and fences target edits by owner and interested status',async()=>{
 const {client,from,q}=fixture();await editTarget(client,'owner','target','컴퓨터공학과');expect(from).toHaveBeenCalledWith('student_target_universities');expect(q.update).toHaveBeenCalledWith({intended_division:'컴퓨터공학과'});expect(q.eq).toHaveBeenCalledWith('user_id','owner');expect(q.eq).toHaveBeenCalledWith('status','interested');
});
it('reads interested goals without treating planned targets as applications',async()=>{
 const {client,q}=fixture();expect(await readGoals(client,'owner')).toEqual({intended_major:'공학',targets:[]});expect(q.eq).toHaveBeenCalledWith('user_id','owner');expect(q.eq).toHaveBeenCalledWith('status','interested');
});
