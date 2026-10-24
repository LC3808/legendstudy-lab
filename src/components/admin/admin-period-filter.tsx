'use client';
import {adminPeriods,type AdminPeriod} from '@/lib/admin/period';
export function AdminPeriodFilter({period,from,to,onChange}:{period:AdminPeriod;from:string;to:string;onChange:(period:AdminPeriod,from:string,to:string)=>void}){
 return <div className="admin-period"><label>기간<select value={period} onChange={e=>onChange(e.target.value as AdminPeriod,from,to)}>{adminPeriods.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{period==='custom'&&<><label>시작일<input type="date" value={from} onChange={e=>onChange(period,e.target.value,to)}/></label><label>종료일<input type="date" value={to} min={from} onChange={e=>onChange(period,from,e.target.value)}/></label></>}</div>;
}
