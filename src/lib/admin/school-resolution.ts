import { lookupSchoolName } from './school';
// Only public school identifiers/names. No account IDs, email, JWT or persistent browser storage.
const cache = new Map<string,{expires:number;value:Promise<string|null>}>();
let active=0;
const queue:Array<()=>void>=[];
function pump(){while(active<4&&queue.length){active++;queue.shift()!();}}
export function clearSchoolResolutionCache(){cache.clear();}
export function resolveSchoolName(office:string,school:string,retry=false):Promise<string|null>{
 const key=JSON.stringify([office,school]),prior=cache.get(key);
 if(prior&&prior.expires>Date.now()&&(!retry||prior.expires===Infinity))return prior.value;
 const value=new Promise<string|null>(resolve=>{queue.push(()=>{
  void lookupSchoolName(office,school,AbortSignal.timeout(15000)).catch(()=>null).then(resolve).finally(()=>{active--;pump();});
 });});
 if(cache.size>=256){for(const [k,v] of cache){if(v.expires!==Infinity){cache.delete(k);break;}}}
 const entry={expires:Infinity,value};cache.set(key,entry);
 void value.then(name=>{entry.expires=Date.now()+(name?86400000:60000);});
 pump();return value;
}
