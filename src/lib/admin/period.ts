export type AdminPeriod='today'|'d7'|'d30'|'d90'|'m6'|'y1'|'month'|'all'|'custom';
export const adminPeriods=[['today','오늘'],['d7','최근 7일'],['d30','최근 30일'],['d90','최근 90일'],['m6','최근 6개월'],['y1','최근 1년'],['month','이번 달'],['all','전체'],['custom','직접 선택']] as const;
/** Korean calendar dates, inclusive start / exclusive end, no browser-zone drift. */
export function periodBounds(period:AdminPeriod,from='',to='',now=new Date()):{from:number;to:number}|null{
 if(period==='all')return {from:-Infinity,to:Infinity};
 const day=new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
 const start=Date.parse(day+'T00:00:00+09:00');
 if(period==='custom'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to))return null;
  const a=Date.parse(from+'T00:00:00+09:00'),b=Date.parse(to+'T00:00:00+09:00')+86400000;
  return Number.isFinite(a)&&Number.isFinite(b)&&a<b?{from:a,to:b}:null;
 }
 const calendar=new Date(start+9*3600000);
 if(period==='m6'||period==='y1'){const date=calendar.getUTCDate();calendar.setUTCDate(1);calendar.setUTCMonth(calendar.getUTCMonth()-(period==='m6'?6:12));const last=new Date(Date.UTC(calendar.getUTCFullYear(),calendar.getUTCMonth()+1,0)).getUTCDate();calendar.setUTCDate(Math.min(date,last));return {from:calendar.getTime()-9*3600000,to:start+86400000};}
 return {from:period==='month'?Date.parse(day.slice(0,7)+'-01T00:00:00+09:00'):start-(period==='d7'?6:period==='d30'?29:period==='d90'?89:0)*86400000,to:start+86400000};
}
