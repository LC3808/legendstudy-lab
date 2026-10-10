import {describe,it,expect} from 'vitest';
import {traceGroups,answerChanges,traceComparison,type TraceRecord} from './traceability';
function row(id:string,prior:string|null=null,leaf='l',problem='p'):TraceRecord{return {evaluation_id:id,completed_at:id,leaf_id:leaf,detail:{dto_version:'qlm-read-v1',evaluation_id:id,prior_evaluation_id:prior,leaf_id:leaf,profile_id:'profile',profile:{rubric_version:'v1'},problem:{id:problem},output:{}}};}
describe('explicit traceability',()=>{
 it('four independent answers stay four processes, all eight records retained',()=>{const rows=[1,2,3,4].flatMap(i=>[row(`a${i}`),row(`b${i}`,`a${i}`)]);const g=traceGroups(rows);expect(g).toHaveLength(1);expect(g[0].processes).toHaveLength(4);expect(g[0].processes.flatMap(p=>p.records)).toHaveLength(8)});
 it('never merges separate questions or rubric profiles',()=>{const b=row('b');b.detail.profile_id='different';expect(traceGroups([row('a'),row('c',null,'other','p2'),b])).toHaveLength(3)});
 it('missing parent, cycles and foreign leaf are explicit, not guessed',()=>{expect(traceGroups([row('a','missing')])[0].processes[0].reason).toContain('조회 범위');expect(traceGroups([row('a','b'),row('b','a')])[0].processes).toHaveLength(2);expect(traceGroups([row('a'),row('b','a','other')])[0].processes).toHaveLength(2)});
 it('reports literal edits without inferring helpfulness or scores',()=>{expect(answerChanges('same\nold','same\nnew')).toEqual({removed:['old'],added:['new']});expect(traceComparison(row('a').detail,row('b').detail)).toBeNull()});
});
