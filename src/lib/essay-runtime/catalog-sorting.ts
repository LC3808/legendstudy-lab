import {isPriorityUniversity} from './catalog-policy';
import {catalogUniversity,isFeaturedUniversity,type CatalogUniversity} from './public-discovery';

export type CatalogSort = 'service'|'applicants'|'competition'|'name';
/** University-wide totals only: never sum potentially overlapping campus/track counts.
 * Supply evidence only after official 2027 scope/source verification. */
export type VerifiedCatalogStatistics = {admissionYear:2027;sourceUrl:string;verifiedAt:string;applicants:number|null;competitionRatio:number|null};
export type CatalogSortingEvidence = {
 statistics?:Readonly<Record<string,VerifiedCatalogStatistics>>;
 /** Actual Provider verification AND the current user's evaluation GATE must pass.
  * Published questions, Owner priority and historical E2E alone are insufficient. */
 evaluationReadyIds?:ReadonlySet<string>;
};
const deferredIds = new Set(['kangnam','eulji']);
function metric(id:string,key:'applicants'|'competitionRatio',evidence:CatalogSortingEvidence){
 const stats=evidence.statistics?.[id];
 if(!stats||stats.admissionYear!==2027||!stats.sourceUrl||!stats.verifiedAt)return null;
 const value=stats[key];
 return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
}
export function servicePriority(u:CatalogUniversity,evidence:CatalogSortingEvidence={}){
 if(evidence.evaluationReadyIds?.has(u.sourceUniversityId))return 0;
 if(isPriorityUniversity(u.sourceUniversityId))return 1;
 if(deferredIds.has(u.sourceUniversityId))return 4;
 const wholeUniversity=catalogUniversity(u.sourceUniversityId)??u;
 return isFeaturedUniversity(wholeUniversity)||(metric(u.sourceUniversityId,'applicants',evidence)??0)>=8000?2:3;
}
/** Current public read model has no verified statistics or gate-approved readiness.
 * Missing data stays missing; UI order never invents counts or enables evaluation. */
export function sortCatalog(rows:readonly CatalogUniversity[],sort:CatalogSort='service',evidence:CatalogSortingEvidence={}){
 return [...rows].sort((a,b)=>{
  if(sort==='service'){
   const group=servicePriority(a,evidence)-servicePriority(b,evidence);
   if(group)return group;
  }
  if(sort!=='name'){
   const key=sort==='competition'?'competitionRatio':'applicants';
   const left=metric(a.sourceUniversityId,key,evidence),right=metric(b.sourceUniversityId,key,evidence);
   if(left!==null&&right!==null&&left!==right)return right-left;
   if(left!==null&&right===null)return -1;
   if(left===null&&right!==null)return 1;
  }
  return a.name.localeCompare(b.name,'ko-KR')||a.sourceUniversityId.localeCompare(b.sourceUniversityId);
 });
}
