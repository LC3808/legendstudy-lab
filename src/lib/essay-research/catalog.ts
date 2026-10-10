/** Research-only preview DTO. No evaluator, DB UUID or historical exam is inferred. */
export type ResearchTrack={id:string;type:string;label:string;status:string;sourceIds:string[];routing:string;problemFormat:string;answerFormat:string;inputModes:string[];formatEvidence:string;inputEvidence:string};
export type ResearchOffering={id:string;universityId:string;name:string;year:number;campus:string;region:string;seoul:boolean;sourceStatus:string;checkedAt:string;sourceIds:string[];sources:string[];admissionNames:string[];tracks:ResearchTrack[];rawMaster:Record<string,string>[];metadataState:'QUARANTINED'|'RESEARCH_CANDIDATE';evaluationState:'NOT_CONNECTED';ownerTier:'UNDECIDED';questionSets:never[]};
export type ResearchCatalog={version:'essay-research-preview-v1';asOf:string;publicationAllowed:false;evaluationAllowed:false;offerings:ResearchOffering[]};
export const NOT_ROUTABLE='NOT_ROUTABLE_WITHOUT_QUESTION_AND_GOLD_PACKAGE';
export function safeSource(url:string){try {const u=new URL(url);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
export function parseResearchCatalog(value:unknown):ResearchCatalog {
 if(!value||typeof value!=='object')throw Error('INVALID_RESEARCH_CATALOG');
 const c=value as ResearchCatalog;
 if(c.version!=='essay-research-preview-v1'||c.publicationAllowed!==false||c.evaluationAllowed!==false||typeof c.asOf!=='string'||!Array.isArray(c.offerings))throw Error('INVALID_RESEARCH_CATALOG');
 const ids=new Set<string>(),tracks=new Set<string>();
 for(const o of c.offerings){
  if(!o||![o.id,o.universityId,o.name,o.campus,o.region,o.sourceStatus,o.checkedAt].every(x=>typeof x==='string'&&x.length>0)||!/^[a-z0-9-]+$/.test(o.universityId)||ids.has(o.id)||o.year!==2027||typeof o.seoul!=='boolean'||!['QUARANTINED','RESEARCH_CANDIDATE'].includes(o.metadataState)||o.evaluationState!=='NOT_CONNECTED'||o.ownerTier!=='UNDECIDED'||!Array.isArray(o.questionSets)||o.questionSets.length||!strings(o.sourceIds)||!strings(o.sources)||!o.sources.every(safeSource)||!strings(o.admissionNames)||!Array.isArray(o.rawMaster)||!o.rawMaster.every(r=>r&&typeof r==='object'&&Object.values(r).every(v=>typeof v==='string'))||!Array.isArray(o.tracks))throw Error('INVALID_RESEARCH_OFFERING');
  ids.add(o.id);
  for(const t of o.tracks){if(!t||![t.id,t.type,t.label,t.status,t.problemFormat,t.answerFormat,t.formatEvidence,t.inputEvidence].every(x=>typeof x==='string')||tracks.has(t.id)||t.routing!==NOT_ROUTABLE||!strings(t.sourceIds)||!t.sourceIds.every(id=>o.sourceIds.includes(id))||!strings(t.inputModes))throw Error('INVALID_RESEARCH_TRACK');tracks.add(t.id);}
 }
 return c;
}
export function researchUniversities(c:ResearchCatalog){return [...new Map(c.offerings.map(o=>[o.universityId,{id:o.universityId,name:o.name}])).values()];}
export function searchResearch(c:ResearchCatalog,query:string,region:string){const q=query.trim().toLocaleLowerCase('ko-KR');return c.offerings.filter(o=>(region==='all'||o.seoul===(region==='seoul'))&&[o.name,o.campus,...o.admissionNames,...o.tracks.map(t=>t.label)].join(' ').toLocaleLowerCase('ko-KR').includes(q));}
