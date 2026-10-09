import {describe,it,expect,vi} from 'vitest';
import {lookupSchoolName} from '@/lib/admin/school';
vi.mock('@/lib/admin/school',()=>({lookupSchoolName:vi.fn().mockResolvedValue('검증 학교')}));
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

it('creates only the missing owner profile with conflict-ignore and never overwrites APP fields',async()=>{
 const {ensureOwnerProfile}=await import('./data');
 const {client,q}=fixture();q.maybeSingle.mockResolvedValue({data:null,error:null});
 const upsert=vi.fn().mockResolvedValue({error:null});Object.assign(q,{upsert});
 await ensureOwnerProfile(client,'owner');
 expect(upsert).toHaveBeenCalledWith({id:'owner'},{onConflict:'id',ignoreDuplicates:true});
 q.maybeSingle.mockResolvedValue({data:{id:'owner'},error:null});upsert.mockClear();
 await ensureOwnerProfile(client,'owner');expect(upsert).not.toHaveBeenCalled();
});
it('stops missing-profile creation if account changes between read and write',async()=>{
 const {ensureOwnerProfile}=await import('./data');const {client,q}=fixture();
 q.maybeSingle.mockResolvedValue({data:null,error:null});
 vi.mocked(client.auth.getSession).mockResolvedValueOnce({data:{session:{user:{id:'owner'}}},error:null} as never).mockResolvedValue({data:{session:{user:{id:'other'}}},error:null} as never);
 const upsert=vi.fn();Object.assign(q,{upsert});
 await expect(ensureOwnerProfile(client,'owner')).rejects.toThrow('ACCOUNT_CHANGED');expect(upsert).not.toHaveBeenCalled();
});
it('writes only canonical school/status/grade fields and rejects invented roles',async()=>{
 const {saveMyProfile}=await import('./data');const {client,q}=fixture();
 const profile={neis_office_code:'J10',neis_school_code:'7530851',academic_status:'student',grade_level:3};
 await saveMyProfile(client,'owner',profile);expect(q.update).toHaveBeenCalledWith(profile);
 await expect(saveMyProfile(client,'owner',{...profile,academic_status:'school_admin'})).rejects.toThrow('INVALID_STATUS');
 await expect(saveMyProfile(client,'owner',{...profile,neis_office_code:null})).rejects.toThrow('INVALID_SCHOOL');
});

it('school identity implies student with an optional grade and ignores a client school name',async()=>{
 const {saveMyProfile}=await import('./data');const {client,q}=fixture();
 await saveMyProfile(client,'owner',{neis_office_code:'J10',neis_school_code:'7530851',academic_status:null,grade_level:null,school_name:'forged'} as never);
 expect(q.update).toHaveBeenCalledWith({neis_office_code:'J10',neis_school_code:'7530851',academic_status:'student',grade_level:null});
 expect(lookupSchoolName).toHaveBeenCalledWith('J10','7530851',expect.any(AbortSignal));
});
it('rejects an unresolved school identity without changing the shared profile',async()=>{
 const {saveMyProfile}=await import('./data');const {client,q}=fixture();
 vi.mocked(lookupSchoolName).mockResolvedValueOnce(null);
 await expect(saveMyProfile(client,'owner',{neis_office_code:'J10',neis_school_code:'invalid',academic_status:'student',grade_level:null})).rejects.toThrow('INVALID_SCHOOL');
 expect(q.update).not.toHaveBeenCalled();
});
it('nonstudent unset school does not retain a stale grade',async()=>{
 const {saveMyProfile}=await import('./data');const {client,q}=fixture();
 await saveMyProfile(client,'owner',{neis_office_code:null,neis_school_code:null,academic_status:'retaker',grade_level:3});
 expect(q.update).toHaveBeenCalledWith({neis_office_code:null,neis_school_code:null,academic_status:'retaker',grade_level:null});
});

it('uses shared labels for MY/Essay history without changing the original ledger facts',()=>{
 const facts=[
  {id:'signup',decision_id:null,transaction_type:'signup_bonus',balance_delta:3,created_at:at,reason_code:'signup_bonus_v1',actor_reference:'system/signup_bonus'},
  {id:'manual',decision_id:null,transaction_type:'admin_grant',balance_delta:1,created_at:at,reason_code:'manual_support: 오류 보상',actor_reference:'operator/private-uuid'},
 ];
 const original=structuredClone(facts);facts.forEach(Object.freeze);Object.freeze(facts);
 const rows=historyRows(facts,[]);
 expect(rows[0]).toMatchObject({label:'신규가입 무료',delta:3});
 expect(rows[1]).toMatchObject({label:'관리자 지급 · 오류 보상',delta:1});
 expect(JSON.stringify(rows)).not.toMatch(/operator|system|manual_support|signup_bonus_v1/);expect(facts).toEqual(original);expect(rows.reduce((n,r)=>n+r.delta,0)).toBe(4);
});
