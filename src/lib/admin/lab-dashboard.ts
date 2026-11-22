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

export function completionRate(requested:unknown,completed:unknown){
 if(typeof requested!=='number'||typeof completed!=='number'||!Number.isSafeInteger(requested)||!Number.isSafeInteger(completed)||requested<0||completed<0||completed>requested)return '확인 불가';
 return requested===0?'요청 없음':`${(completed/requested*100).toLocaleString('ko-KR',{maximumFractionDigits:1})}%`;
}
export function durationLabel(seconds:unknown){
 if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0)return '기록 없음';
 const rounded=Math.round(seconds);return `${Math.floor(rounded/60).toLocaleString('ko-KR')}분 ${rounded%60}초`;
}
export function activityDuration(run:{state:string;created_at:string;completed_at:string|null},now:number){
 const start=Date.parse(run.created_at),end=run.state==='completed'?Date.parse(run.completed_at??''):run.state==='reserved'?now:NaN;
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return {label:'확인 필요',delayed:false};
 const seconds=(end-start)/1000;return {label:durationLabel(seconds)+(run.state==='reserved'?' 경과':''),delayed:run.state==='reserved'&&seconds>=900};
}
export function memberLabel(uid:string){return uid?`회원 ${uid.slice(0,8)}`:'회원 확인 필요';}
