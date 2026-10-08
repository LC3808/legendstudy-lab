"use client";
import {useEffect,useState} from 'react';
import {nameSchoolDistribution,type SchoolCount,type NamedSchoolCount} from '@/lib/admin/school-distribution';
import {formatNumber} from '@/lib/admin/format';
export function SchoolDistribution({rows,unsetCount}:{rows:SchoolCount[];unsetCount:number|null}) {
 const key=JSON.stringify(rows);const [resolved,setResolved]=useState<{key:string;rows:NamedSchoolCount[]}|null>(null);
 useEffect(()=>{let active=true;void nameSchoolDistribution(rows).then(value=>{if(active)setResolved({key,rows:value});});return()=>{active=false;};},[key,rows]);
 const display=resolved?.key===key?resolved.rows:rows.slice(0,20).map((r,i)=>({id:String(i),label:r.officeCode?'학교명 조회 중…':'학교명 확인 필요',count:r.count}));
 const all=unsetCount===null?display:[...display,{id:'unset',label:'학교 미설정',count:unsetCount}];
 if(!all.length)return <p className="admin-muted">표시할 데이터가 없습니다.</p>;
 const max=Math.max(...all.map(r=>r.count));
 return <ul className="admin-bars">{all.map(r=><li key={r.id}><span className="admin-bars__label">{r.label}</span><span className="admin-bars__track" aria-hidden="true"><span className="admin-bars__fill" style={{width:max>0?`${Math.max(4,r.count/max*100)}%`:'0%'}}/></span><span className="admin-bars__count">{formatNumber(r.count)}</span></li>)}</ul>;
}
