import { lookupSchoolName } from './school';
export type SchoolCount = {key:string;officeCode?:string|null;count:number};
export type NamedSchoolCount = {id:string;label:string;count:number};
// Public school names only, never user identity or counts; bounded in-memory cache.
const cache = new Map<string,{expires:number;value:Promise<string|null>}>();
function resolve(office:string,school:string) {
 const key=JSON.stringify([office,school]);const entry=cache.get(key);
 if(entry&&entry.expires>Date.now())return entry.value;
 if(cache.size>=256)cache.clear();
 const value=lookupSchoolName(office,school,AbortSignal.timeout(10000)).catch(()=>null);
 const next={expires:Date.now()+60000,value};cache.set(key,next);
 void value.then(name=>{next.expires=Date.now()+(name?86400000:60000);});
 return value;
}
export async function nameSchoolDistribution(rows:SchoolCount[]):Promise<NamedSchoolCount[]> {
 const bounded=rows.slice(0,20);const out:NamedSchoolCount[]=new Array(bounded.length);let next=0;
 await Promise.all(Array.from({length:Math.min(4,bounded.length)},async()=>{
  while(next<bounded.length){const i=next++;const r=bounded[i];
   const name=r.officeCode&&r.key?await resolve(r.officeCode,r.key):null;
   out[i]={id:JSON.stringify([r.officeCode,r.key]),label:name||'학교명 확인 필요',count:r.count};
  }
 }));return out;
}
