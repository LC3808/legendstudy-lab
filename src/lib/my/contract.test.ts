import {it,expect} from 'vitest';
import {myUsage,myIdentity,comparableDimensionDelta,type DimensionPoint} from './contract';
const point:DimensionPoint={evaluationId:'e1',attemptId:'a1',questionId:'q',criterionId:'c',definitionVersion:'v1',questionMetadataVersion:'v1',regimeKey:'r1',evaluationVersion:'v1',contractVersion:'v1',evidenceManifest:'hash',status:'completed',requestKind:'student',invalidatedAt:null,completedAt:'2026-10-08T01:00:00Z',submittedAt:'2026-10-08T00:00:00Z',supersedesEvaluationId:null,level:2};
it('retains pending Credit and no fabricated period entitlement',()=>{
 expect(myUsage({status:'loading'})).toEqual({credit:{status:'loading'},periodEntitlement:null});
 expect(myIdentity({id:'u',email:'u@example.test'},{display_name:'별명',neis_school_code:'1',neis_office_code:'B10',grade_level:3,academic_status:'retaker'})).toMatchObject({displayName:'별명',grade:null,statusLabel:'N수·검정고시 등'});
});
it('compares only same-context 1–5 levels on successive distinct attempts',()=>{
 const after={...point,evaluationId:'e2',attemptId:'a2',submittedAt:'2026-10-08T02:00:00Z',level:4};
 expect(comparableDimensionDelta(point,after)).toBe(2);
 for(const changed of [{requestKind:'operator_reevaluation'},{regimeKey:'r2'},{criterionId:'other'},{definitionVersion:'v2'},{contractVersion:'v2'},{questionId:'q2'},{level:null},{invalidatedAt:'2026-10-08'},{attemptId:'a1'},{supersedesEvaluationId:'e1'}]) expect(comparableDimensionDelta(point,{...after,...changed})).toBeNull();
});
