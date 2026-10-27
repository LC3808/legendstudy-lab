import type {Report,Change} from './evaluation-report';
export type GrowthPoint={report:Report;runId:string;at:string;label:string};
export type GrowthSeries={id:string;at:string;title:string;points:GrowthPoint[];changes:Change[];strengths:Report['strengths'];weaknesses:Report['weaknesses']};
/** Exact exam/question/version identity only; no score averaging or inferred Math scores. */
export function growthHistory(entries:{run:Record<string,unknown>;reports:Report[];title:(id:string,index:number)=>string}[]):GrowthSeries[]{
 const groups=new Map<string,GrowthPoint[]>(),titles=new Map<string,string>();
 for(const {run,reports,title} of entries.sort((a,b)=>String(a.run.created_at).localeCompare(String(b.run.created_at))||String(a.run.id).localeCompare(String(b.run.id)))){
  reports.forEach((report,index)=>{
   const valid=report.pins.length>0&&report.pins.every(Boolean);
   const key=valid?JSON.stringify([run.exam_id,...report.pins]):report.id;
   const points=groups.get(key)??[];
   if(points.some(p=>p.report.id===report.id))return;
   points.push({report,runId:String(run.id),at:String(run.created_at),label:run.parent_id?'무료 재첨삭':points.length?'새 답안 첨삭':'최초 첨삭'});
   groups.set(key,points);titles.set(key,title(report.id,index));
  });
 }
 return [...groups.entries()].map(([key,points])=>{
  const first=points[0].report,last=points.at(-1)!.report;
  const changes:Change[]=points.length<2?[]:last.rubric.flatMap(a=>{const b=first.rubric.find(b=>b.id===a.id&&b.name===a.name);return b?[{id:a.id,name:a.name,before:b,after:a,direction:a.stars===null||b.stars===null?'UNAVAILABLE':a.stars>b.stars?'IMPROVED':a.stars<b.stars?'DECLINED':'UNCHANGED'}]:[];});
  return {id:last.id,at:points.at(-1)!.at,title:titles.get(key)!,points,changes,strengths:last.strengths,weaknesses:last.weaknesses};
 }).sort((a,b)=>a.at.localeCompare(b.at));
}
/** Missing, duplicate or renamed criteria are gaps, never interpolated. */
export function criterionValues(points:GrowthPoint[],id:string,name:string){return points.map(p=>{const matches=p.report.rubric.filter(c=>c.id===id);return matches.length===1&&matches[0].name===name?matches[0].stars:null;});}
export function resultHref(point:GrowthPoint){return '/my/essays/result/?source=exam&id='+encodeURIComponent(point.runId);}
