import {growthLabel} from './growth-label';
import type {Criterion} from './evaluation-report';
/** Presentation only: reviewed aliases or the intact original, never a new rubric. */
export function criterionDisplayName(name:string,id:string,criterionCount=0){
 const alias=growthLabel(name,id);
 if(!['표시명 검수 대기','평가 기준명 확인 필요'].includes(alias))return alias;
 if(criterionCount===1 && /(채점\s*기준|평가\s*기준)[\s\S]*배점/.test(name))return '문항별 채점기준';
 return name;
}
/** Match the complete official label; never join by ordinal or shortened title. */
export function criterionEvidence(c:Criterion,labels:string[]){
 const prefix=c.name+' — ';
 return labels.filter(s=>s.startsWith(prefix)).map(original=>({original,body:original.slice(prefix.length)}));
}

/** Unreviewed official prose stays in the immutable report, not in student headings. */
export function studentCriterionName(name:string,_id:string,index:number){
 const compact=Array.from(name.replace(/\(?\s*\d+(?:\.\d+)?\s*%\s*\)?/g,'').replace(/\s+/g,' ').trim()).slice(0,35).join('').replaceAll(' ','');
 for(const [key,alias] of [['구성과전개','구성과 전개'],['사회계약론','사회계약론 이해'],['공리주의','공리주의 이해와 평가'],['미래세대','미래 세대의 도덕적 의무'],['문장과표현','문장과 표현']])if(compact.includes(key))return alias;
 return `평가 항목 ${index+1}`;
}
