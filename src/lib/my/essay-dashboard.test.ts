import {expect,it,vi} from 'vitest';
import {summarizeRecords,mathRead,type RecordItem} from './essay-dashboard';
import type {SupabaseClient} from '@supabase/supabase-js';
const row=(id:string,rewrite=false,status='completed',valid=true):RecordItem=>({id,source:'essay',question:'문제',university:null,at:'2026-10-09',rewrite,evaluations:[{id:'e'+id,status,valid,at:'2026-10-09',completedAt:'2026-10-09'}]});
it('counts distinct evaluated answers, not retries, and excludes invalidated/failed evaluations',()=>{
 const a=row('a');a.evaluations.push({...a.evaluations[0],id:'retry'});
 expect(summarizeRecords([a,row('b',true),row('c',true,'failed'),row('d',false,'completed',false)])).toEqual({evaluatedExams:0,evaluatedCycles:0,evaluated:2,rewritten:2,reevaluated:1,latest:'2026-10-09'});
});
it('does not manufacture completion timestamps for Math',()=>{
 const r=row('m');r.source='math';r.evaluations[0].completedAt=null;
 expect(summarizeRecords([r]).latest).toBeNull();
});
it('counts one exam and two paid rounds while keeping the free rewrite in its original round',()=>{
 const initial={...row('first'),source:'exam' as const,examId:'exam',questionIds:['q1']};
 const rewrite={...row('rewrite',true),source:'exam' as const,examId:'exam',parentId:'first',questionIds:['q1']};
 const later={...row('later'),source:'exam' as const,examId:'exam',questionIds:['q2']};
 expect(summarizeRecords([initial,rewrite,later])).toMatchObject({evaluatedExams:1,evaluatedCycles:2,reevaluated:1});
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
it('groups by canonical exam and exact question set, never similar labels',async()=>{
 const {historyGroups,answerVersion}=await import('./essay-dashboard');
 const a={...row('a'),source:'exam' as const,examId:'exam1',questionIds:['q1','q2']};
 const b={...row('b'),source:'exam' as const,examId:'exam1',questionIds:['q2','q1'],submissionIndex:3};
 const c={...a,id:'c',examId:'exam2'};
 expect(historyGroups([a,b,c],true).map(g=>g.length).sort()).toEqual([1,2]);
 expect(answerVersion(b)).toBe('수정 제출 답안 2');
});

it('counts Math rounds only when all questions have completed and keeps free rewrites in the paid cycle',()=>{
 const initial:RecordItem={...row('round'),source:'math',examId:'exam',mathSession:{run_id:'round',exam_id:'exam',parent_id:null,state:'reserved',created_at:'2026-10-25',completed_at:null,questions:[]}};
 expect(summarizeRecords([initial])).toMatchObject({evaluated:0,evaluatedCycles:0,latest:null});
 initial.mathSession!.state='completed';
 const free={...initial,id:'free',parentId:'round',rewrite:true};
 expect(summarizeRecords([initial,free])).toMatchObject({evaluated:2,evaluatedExams:1,evaluatedCycles:1,reevaluated:1});
});
it('merges Math rounds without duplicating their legacy attempt projection',async()=>{
 const {readMathDashboard}=await import('./essay-dashboard');
 const rpc=vi.fn(async(name:string)=>({data:name==='math_input'?{dto_version:'math-input-v1',action:'history',result:{attempts:[{attempt_id:'a',created_at:'2026-10-25',evaluations:[]},{attempt_id:'old',created_at:'2026-10-24',evaluations:[]}]}}:{version:'math-session-history-v1',runs:[{run_id:'round',exam_id:'exam',parent_id:null,state:'reserved',created_at:'2026-10-25',completed_at:null,questions:[{attempt_id:'a',question_id:'q',leaf_id:'l',evaluation_id:'e',state:'COMPLETED'}]}]},error:null}));
 const c={auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})},rpc} as unknown as SupabaseClient;
 const records=await readMathDashboard(c,'owner');
 expect(records.map(r=>r.id)).toEqual(['round','old']);
 expect(summarizeRecords(records).evaluated).toBe(0);
});
