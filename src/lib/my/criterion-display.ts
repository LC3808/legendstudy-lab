import {growthLabel} from './growth-label';
import type {Criterion} from './evaluation-report';
/** Presentation only: reviewed aliases or the intact original, never a new rubric. */
export function criterionDisplayName(name:string,id:string){
 const alias=growthLabel(name,id);
 return ['표시명 검수 대기','평가 기준명 확인 필요'].includes(alias)?name:alias;
}
/** Match the complete official label; never join by ordinal or shortened title. */
export function criterionEvidence(c:Criterion,labels:string[]){
 const prefix=c.name+' — ';
 return labels.filter(s=>s.startsWith(prefix)).map(original=>({original,body:original.slice(prefix.length)}));
}
