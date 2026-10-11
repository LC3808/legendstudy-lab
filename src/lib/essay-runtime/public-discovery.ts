import data from '@/data/essay-public-catalog.json';
export type Offering={id:string;campus:string;region:string;admissionYear:number;admissionNames:string[];types:string[];rawEssayTypes:string[];sourceIds:string[];sources:string[];verifiedAt:string;sourceStatus:string};
export type CatalogUniversity={sourceUniversityId:string;universityId:string|null;canonicalSlug:string|null;name:string;offerings:Offering[]};
export const publicCatalog=data as {version:string;asOf:string;universities:CatalogUniversity[]};
export function filterCatalog(query:string,region:string,type:string,year:string){
 const q=query.trim().toLocaleLowerCase('ko-KR');
 return publicCatalog.universities.map(u=>({...u,offerings:u.offerings.filter(o=>(!region||o.region===region)&&(!type||o.types.includes(type))&&(!year||String(o.admissionYear)===year)&&(!q||[u.name,o.campus,...o.admissionNames].join(' ').toLocaleLowerCase('ko-KR').includes(q)))})).filter(u=>u.offerings.length);
}
export function catalogUniversity(id:string){return publicCatalog.universities.find(u=>u.sourceUniversityId===id);}
