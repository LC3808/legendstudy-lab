import {isPriorityUniversity} from './catalog-policy';
import data from '@/data/essay-public-catalog.json';
export type AdmissionDetail={sourceId:string;name:string;facts:Partial<Record<'intake_count'|'exam_date'|'exam_time'|'question_count'|'answer_length'|'csat_minimum'|'essay_weight'|'school_record_weight',string>>;sourceStatus:string;verifiedAt:string;sourceUrl:string;documentUrl:string|null;documentBasis:string;applicants:null;competitionRatio:null};
export type Offering={id:string;campus:string;region:string;sourceRegion?:string;admissionYear:number;admissionNames:string[];types:string[];rawEssayTypes:string[];sourceIds:string[];sources:string[];verifiedAt:string;sourceStatus:string;admissionDetails?:AdmissionDetail[]};
export type CatalogUniversity={sourceUniversityId:string;universityId:string|null;canonicalSlug:string|null;name:string;researchSources?:{url:string;label:string;verifiedAt:string}[];offerings:Offering[]};
export const publicCatalog=data as {version:string;asOf:string;universities:CatalogUniversity[]};
export function filterCatalog(query:string,region:string,type:string,year:string){
 const q=query.trim().toLocaleLowerCase('ko-KR');
 return publicCatalog.universities.map(u=>({...u,offerings:u.offerings.filter(o=>(!region||o.region===region)&&(!type||o.types.includes(type))&&(!year||String(o.admissionYear)===year)&&(!q||[u.name,o.campus,...o.admissionNames].join(' ').toLocaleLowerCase('ko-KR').includes(q)))})).filter(u=>u.offerings.length);
}
export function catalogUniversity(id:string){return publicCatalog.universities.find(u=>u.sourceUniversityId===id);}

export function isFeaturedUniversity(u:CatalogUniversity){
 // Applicants are currently unverified/null. Do not infer 8,000 from Owner order.
 return isPriorityUniversity(u.sourceUniversityId)||u.offerings.some(o=>o.region==='서울');
}
export function campusLabel(campus:string){
 const names:Record<string,string>={'Global Campus':'글로벌캠퍼스','Sungsim Campus':'성심교정','International Campus':'국제캠퍼스','Jukjeon Campus':'죽전캠퍼스','Natural Sciences Campus':'자연과학캠퍼스','Main Campus':'본교','Suwon Campus':'수원캠퍼스','Seongnam Campus':'성남캠퍼스','Uijeongbu Campus':'의정부캠퍼스','Da Vinci Campus':'다빈치캠퍼스','Uijeongbu·Dongducheon Campuses':'의정부·동두천캠퍼스'};
 return names[campus]??campus.split(' (')[0];
}
