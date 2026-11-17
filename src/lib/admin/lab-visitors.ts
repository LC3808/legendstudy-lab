export type LabVisitors={version:'lab-visitors-v1';state:'CONNECTED';startDate:string;endDate:string;timeZone:string;totalUsers:number;sessions:number;pageViews:number;fetchedAt:string;limited:boolean};
export function isLabVisitors(value:unknown):value is LabVisitors{
 const v=value as LabVisitors;
 return v?.version==='lab-visitors-v1'&&v.state==='CONNECTED'&&[v.totalUsers,v.sessions,v.pageViews].every(n=>Number.isSafeInteger(n)&&n>=0)&&[v.startDate,v.endDate,v.fetchedAt].every(s=>typeof s==='string'&&Number.isFinite(Date.parse(s)))&&typeof v.timeZone==='string'&&typeof v.limited==='boolean';
}
