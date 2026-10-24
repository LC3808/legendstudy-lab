import {beforeEach,expect,it,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {resolveReadyUniversities} from './service-status';
const exam='11111111-1111-4111-8111-111111111111',question='22222222-2222-4222-8222-222222222222',university='33333333-3333-4333-8333-333333333333';
vi.mock('./public-discovery',()=>({publicCatalog:{universities:[{sourceUniversityId:'test',universityId:'33333333-3333-4333-8333-333333333333'}]},catalogUniversity:()=>({universityId:'33333333-3333-4333-8333-333333333333'})}));
const rpc=vi.fn(),from=vi.fn(()=>{throw Error('Base tables are intentionally inaccessible');});
const client={rpc,from} as unknown as SupabaseClient;
beforeEach(()=>{vi.clearAllMocks();rpc.mockResolvedValue({data:[{examId:exam,universityId:university,year:2026,kind:'admission',track:'인문',title:'논술',questionCount:1,questions:[{id:question,label:'문제 1'}]}],error:null});});
it('resolves unpublished exam metadata using the existing public browse RPC',async()=>{
 expect(await resolveReadyUniversities(client,[{examId:exam,questionIds:[question]}])).toEqual(new Set([university]));
 expect(rpc).toHaveBeenCalledWith('essay_browse_catalog',{p_university:'test'});expect(from).not.toHaveBeenCalled();
});
it('requires exact admitted question identities, not exam presence alone',async()=>{
 expect(await resolveReadyUniversities(client,[{examId:exam,questionIds:[university]}])).toEqual(new Set());
});
it('never enables a university on a metadata failure or identity mismatch',async()=>{
 rpc.mockResolvedValue({error:{code:'42501'},data:null});expect(await resolveReadyUniversities(client,[{examId:exam,questionIds:[question]}])).toEqual(new Set());
 rpc.mockResolvedValue({error:null,data:[{examId:exam,universityId:question}]});expect(await resolveReadyUniversities(client,[{examId:exam,questionIds:[question]}])).toEqual(new Set());
});
it('does not browse without runtime admission or after unmount',async()=>{
 expect(await resolveReadyUniversities(client,[])).toEqual(new Set());expect(await resolveReadyUniversities(client,[{examId:exam,questionIds:[question]}],()=>false)).toEqual(new Set());expect(rpc).not.toHaveBeenCalled();
});
