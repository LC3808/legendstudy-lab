import {describe,it,expect} from 'vitest';
import {qualityMetadata,sameTraceEdge} from './metadata';
import {traceGroups,type TraceRecord} from './traceability';
function row(id:string,root=id,prior:string|null=null,subject='a',rubric='v1',problem='p'):TraceRecord {
 return {evaluation_id:id,completed_at:id,leaf_id:'leaf',detail:{dto_version:'qlm-read-v1',evaluation_id:id,attempt_id:'attempt-'+id,leaf_id:'leaf',profile_id:'profile',profile:{rubric_version:rubric},problem:{id:problem},prior_evaluation_id:prior,quality_metadata:{version:'quality-metadata-v1',student_reference:'qs1_'+subject.repeat(64),attempt_id:'attempt-'+id,root_attempt_id:'attempt-'+root,lineage_id:'attempt-'+root,predecessor_attempt_id:prior?'attempt-'+prior:null,prior_evaluation_id:prior,relationship_state:prior?'LINKED':'ROOT',problem_set_id:'set',problem_id:problem,problem_label:'저장된 문항',leaf_id:'leaf',evaluation_profile_id:'profile',rubric_version:rubric,exam_metadata_verified:false,university_name:'unverified name',academic_year:2026}}};
}
describe('operator metadata contract',()=>{
 it('one pseudonym, four independent roots and four explicit pairs',()=>{
  const rows=[1,2,3,4].flatMap(i=>[row('a'+i),row('b'+i,'a'+i,'a'+i)]);
  const g=traceGroups(rows);expect(g).toHaveLength(1);expect(g[0].users).toHaveLength(1);expect(g[0].users[0].processes).toHaveLength(4);
  expect(g[0].processes.every(p=>p.records.length===2)).toBe(true);
 });
 it('separates different users even when a forged root matches',()=>{
  const a=row('a'),b=row('b','a','a','b');expect(sameTraceEdge(a.detail,b.detail)).toBe(false);
  const g=traceGroups([a,b]);expect(g[0].users).toHaveLength(2);expect(g[0].processes).toHaveLength(2);
 });
 it('separates other problems and rubrics despite a prior evaluation link',()=>{
  const a=row('a');for(const b of [row('b','a','a','a','v2'),row('b','a','a','a','v1','other')]){
   expect(sameTraceEdge(a.detail,b.detail)).toBe(false);expect(traceGroups([a,b])).toHaveLength(2);
  }
 });
 it('rejects missing or inconsistent metadata without guessing users',()=>{
  const a=row('a'),b=row('b');b.detail.quality_metadata={version:'quality-metadata-v1'};
  expect(qualityMetadata(b.detail)).toBeNull();expect(traceGroups([a,b])[0].users).toHaveLength(2);
  expect(traceGroups([row('b','a','a')])[0].processes[0].reason).toContain('조회 범위');
 });
 it('does not expose unverified university or year',()=>{
  const d=row('a').detail;expect(qualityMetadata(d)).toMatchObject({university:'',year:null});
  (d.quality_metadata as Record<string,unknown>).exam_metadata_verified=true;
  expect(qualityMetadata(d)).toMatchObject({university:'unverified name',year:2026});
 });
 it('does not trust conflicting attempt pins or unsupported metadata versions',()=>{
  const d=row('a').detail;d.attempt_id='other';expect(qualityMetadata(d)).toBeNull();
  const e=row('b').detail;(e.quality_metadata as Record<string,unknown>).version='v2';expect(qualityMetadata(e)).toBeNull();
 });
});
