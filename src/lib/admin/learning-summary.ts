export type LearningSummary={version:'admin-learning-v1';members:{accounts:number;profiles:number;without_profile:number}|null;essay:Counts;math:Counts;registry:{universities:number;exams:number;questions:number;is_published:number}|null};
type Counts={total:number;initial:number;rewrites:number;completed:number;pending:number;failed:number};
export function parseLearningSummary(raw:unknown):LearningSummary{
 const v=raw as LearningSummary;
 const valid=(o:unknown,keys:string[])=>!!o&&typeof o==='object'&&keys.every(k=>Number.isSafeInteger((o as Record<string,unknown>)[k])&&Number((o as Record<string,unknown>)[k])>=0);
 if(v?.version!=='admin-learning-v1'||![v.essay,v.math].every(c=>valid(c,['total','initial','rewrites','completed','pending','failed']))||v.members!==null&&!valid(v.members,['accounts','profiles','without_profile'])||v.registry!==null&&!valid(v.registry,['universities','exams','questions','is_published']))throw Error('INVALID_ADMIN_LEARNING');
 return v;
}
