import {isPriorityUniversity,priorityUniversityIds} from './catalog-policy';
import demand from '@/data/essay-catalog-demand.json';
import {catalogUniversity,isFeaturedUniversity,type CatalogUniversity} from './public-discovery';

export type CatalogSort = 'service'|'applicants'|'competition'|'name';
/** University-wide totals only: never sum potentially overlapping campus/track counts.
 * Supply evidence only after official 2027 scope/source verification. */
export type VerifiedCatalogStatistics = {verificationStatus:'verified';admissionYear:2027;sourceUrl:string;verifiedAt:string;applicants:number|null;competitionRatio:number|null};
export type CatalogSortingEvidence = {
 statistics?:Readonly<Record<string,VerifiedCatalogStatistics>>;
 /** Actual Provider verification AND the current user's evaluation GATE must pass.
  * Published questions, Owner priority and historical E2E alone are insufficient. */
 evaluationReadyIds?:ReadonlySet<string>;
};
// Source research is joined by canonical IDs at build time; raw unverified values
// never enter this browser projection. Owner policy is maintained independently.
const demandRows:Record<string,{verificationStatus:string;admissionYear:number;sourceUrl:string|null;verifiedAt:string|null;applicants:number|null;competitionRatio:number|null}>=demand.universities;
export const catalogSortingEvidence:CatalogSortingEvidence={statistics:Object.fromEntries(
 Object.entries(demandRows).flatMap(([id,row])=>row.verificationStatus==='verified'&&row.admissionYear===2027&&row.sourceUrl&&row.verifiedAt
  ?[[id,{verificationStatus:'verified' as const,admissionYear:2027 as const,sourceUrl:row.sourceUrl,verifiedAt:row.verifiedAt,applicants:row.applicants,competitionRatio:row.competitionRatio}]]:[])
)};
const ownerOrder=new Map<string,number>(priorityUniversityIds.map((id,index)=>[id,index]));
const deferredIds = new Set(['kangnam','eulji']);
function metric(id:string,key:'applicants'|'competitionRatio',evidence:CatalogSortingEvidence){
 const stats=evidence.statistics?.[id];
 if(!stats||stats.verificationStatus!=='verified'||stats.admissionYear!==2027||!stats.sourceUrl||!stats.verifiedAt)return null;
 const value=stats[key];
 return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
}
export function servicePriority(u:CatalogUniversity,evidence:CatalogSortingEvidence=catalogSortingEvidence){
 if(evidence.evaluationReadyIds?.has(u.sourceUniversityId))return 0;
 if(isPriorityUniversity(u.sourceUniversityId))return 1;
 if(deferredIds.has(u.sourceUniversityId))return 4;
 const wholeUniversity=catalogUniversity(u.sourceUniversityId)??u;
 return isFeaturedUniversity(wholeUniversity)||(metric(u.sourceUniversityId,'applicants',evidence)??0)>=8000?2:3;
}
/** Current public read model has no verified statistics or gate-approved readiness.
 * Missing data stays missing; UI order never invents counts or enables evaluation. */
export function sortCatalog(rows:readonly CatalogUniversity[],sort:CatalogSort='service',evidence:CatalogSortingEvidence=catalogSortingEvidence){
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
   if(left===null&&right===null&&sort!=='service'){
    const group=servicePriority(a,evidence)-servicePriority(b,evidence);
    if(group)return group;
   }
  }
  if(sort!=='name'){
   const owner=(ownerOrder.get(a.sourceUniversityId)??Number.MAX_SAFE_INTEGER)-(ownerOrder.get(b.sourceUniversityId)??Number.MAX_SAFE_INTEGER);
   if(owner)return owner;
  }
  return a.name.localeCompare(b.name,'ko-KR')||a.sourceUniversityId.localeCompare(b.sourceUniversityId);
 });
}
