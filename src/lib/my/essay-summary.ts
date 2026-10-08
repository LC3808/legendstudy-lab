import type {DimensionPoint} from './contract';
export type EssaySummary={sessions:{id:string;universityId:string;universityName:string;admissionYear:number;questionId:string;questionLabel:string;attemptCount:number;latestActivity:string|null}[];points:DimensionPoint[];hasMoreSessions:boolean;hasMoreEvaluations:boolean};
function obj(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_ESSAY');return v as Record<string,unknown>;}
function str(v:unknown):string{if(typeof v!=='string')throw new Error('INVALID_ESSAY');return v;}
function nullable(v:unknown):string|null{return v===null?null:str(v);}
function int(v:unknown):number{if(!Number.isSafeInteger(v)||(v as number)<0)throw new Error('INVALID_ESSAY');return v as number;}
function list(v:unknown,max:number):unknown[]{if(!Array.isArray(v)||v.length>max)throw new Error('INVALID_ESSAY');return v;}
export function parseEssaySummary(v:unknown):EssaySummary{
 const r=obj(v);if(r.version!=='essay-summary-v1'||typeof r.has_more_sessions!=='boolean'||typeof r.has_more_evaluations!=='boolean')throw new Error('INVALID_ESSAY');
 const sessions=list(r.sessions,50).map(v=>{const s=obj(v);return {id:str(s.id),universityId:str(s.university_id),universityName:str(s.university_name),admissionYear:int(s.admission_year),questionId:str(s.question_id),questionLabel:str(s.question_label),attemptCount:int(s.attempt_count),latestActivity:nullable(s.latest_activity)};});
 const points=list(r.evaluations,50).flatMap(v=>{const e=obj(v);return list(e.dimensions,100).map(v=>{const d=obj(v),level=d.level_1_to_5===null?null:int(d.level_1_to_5);if(level!==null&&(level<1||level>5))throw new Error('INVALID_ESSAY');return {evaluationId:str(e.id),attemptId:str(e.attempt_id),questionId:str(e.question_id),criterionId:str(d.criterion_id),definitionVersion:str(d.definition_version),questionMetadataVersion:str(e.question_metadata_version),regimeKey:str(e.regime_key),evaluationVersion:str(e.evaluation_version),contractVersion:str(e.contract_version),evidenceManifest:str(e.evidence_manifest_sha256),status:str(e.status),requestKind:str(e.request_kind),invalidatedAt:nullable(e.invalidated_at),completedAt:nullable(e.completed_at),submittedAt:str(e.submitted_at),supersedesEvaluationId:nullable(e.supersedes_evaluation_id),level};});});
 return {sessions,points,hasMoreSessions:r.has_more_sessions,hasMoreEvaluations:r.has_more_evaluations};
}
