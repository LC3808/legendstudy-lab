import reviewed from '@/data/essay-university-schedules.json';
import {campusLabel,type CatalogUniversity} from './public-discovery';
import {officialUrl} from './catalog';

export type UniversitySchedule = {
 id:string; academicYear:number; track:string; campus:string; date:string|null;
 endDate?:string|null; time:string|null; duration:string|null; applicationPeriod:string|null;
 sourceUrl:string; verifiedAt:string; basis:string; note?:string;
};
type Reviewed = {academicYear:number;universities:Record<string,UniversitySchedule[]>};
export const scheduleAcademicYear = reviewed.academicYear;
/** Dates are civil Korean dates; never convert them via the browser's local zone. */
export function scheduleDateLabel(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const d=new Date(value+'T00:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)return value;
 return `${value} (${'일월화수목금토'[d.getUTCDay()]})`;
}
export function universitySchedules(u:CatalogUniversity):UniversitySchedule[]{
 const rows=(reviewed as Reviewed).universities[u.sourceUniversityId]??[];
 const replacedYears=new Set(rows.map(r=>r.academicYear));
 const legacy=u.offerings.filter(o=>!replacedYears.has(o.admissionYear)).flatMap(o=>(o.admissionDetails??[])
  .filter(d=>['OFFICIAL_CONFIRMED','OFFICIAL_PARTIAL'].includes(d.sourceStatus)&&(d.facts.exam_date||d.facts.exam_time)&&officialUrl(d.documentUrl??d.sourceUrl))
  .map(d=>({id:`${o.id}:${d.sourceId}`,academicYear:o.admissionYear,track:d.name,campus:campusLabel(o.campus),
   date:d.facts.exam_date??null,time:d.facts.exam_time&&/\d{1,2}:\d{2}/.test(d.facts.exam_time)?d.facts.exam_time:null,
   duration:d.facts.exam_time&&!/\d{1,2}:\d{2}/.test(d.facts.exam_time)?d.facts.exam_time:null,
   applicationPeriod:null,sourceUrl:officialUrl(d.documentUrl??d.sourceUrl)!,verifiedAt:d.verifiedAt,basis:d.documentBasis})));
 return [...rows.filter(r=>officialUrl(r.sourceUrl)),...legacy];
}
