import {analyticsWindow} from './analytics';
export type LabDashboardPeriod='today'|'d7'|'d30'|'all'|'custom';
export type LabDashboardSummary={version:'admin-lab-dashboard-v1';students:number;avg_seconds:number|null;duration_samples:number;universities:{university_id:string|null;university:string|null;requests:number;students:number;completed:number;failed:number;free_revisions:number;beta_requests:number}[]};
export function labDashboardRange(period:Exclude<LabDashboardPeriod,'custom'>,now:Date){return period==='all'?{p_from:null,p_to:null}:analyticsWindow(period,'','',now)!;}
export function labDashboardHref(range:{p_from:string|null;p_to:string|null},source:string,extra:Record<string,string>={}){
 const p=new URLSearchParams({visibility:'all',...extra});if(source)p.set('source',source);
 const day=(s:string)=>new Date(Date.parse(s)+9*3600000).toISOString().slice(0,10);
 if(range.p_from&&range.p_to){p.set('from',day(range.p_from));p.set('to',day(new Date(Date.parse(range.p_to)-1).toISOString()));}
 return '/admin/essay-runs/?'+p.toString();
}
export function dashboardNumber(n:unknown,suffix=''){return typeof n==='number'&&Number.isFinite(n)&&n>=0?n.toLocaleString('ko-KR',{maximumFractionDigits:1})+suffix:'확인 불가';}
