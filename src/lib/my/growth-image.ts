import {growthLabel} from './growth-label';
import type {Change} from './evaluation-report';
export type GrowthImageData={titles:string[];completed:number;series:{title:string;bars:{name:string;before:number;after:number}[]}[]};
/** Explicit field projection. Never spread a report: answers, feedback and IDs stay private. */
export function growthImageData(records:{university:string|null;exam:string}[],completed:number,series:{title:string;changes:Change[]}[]):GrowthImageData{
 return {titles:[...new Set(records.map(r=>[r.university,r.exam].filter(Boolean).join(' · ')))].slice(0,6),completed,
 series:series.map(s=>({title:s.title,bars:s.changes.flatMap(c=>c.before.stars!==null&&c.after.stars!==null?[{name:growthLabel(c.name),before:c.before.stars,after:c.after.stars}]:[])})).filter(s=>s.bars.length).slice(-6)};
}
export async function saveGrowthImage(data:GrowthImageData){
 await document.fonts.ready;
 const width=1080;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=400+data.titles.length*40+data.series.reduce((n,s)=>n+100+Math.ceil(s.bars.length/3)*340,0);
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('CANVAS_UNAVAILABLE');
 ctx.fillStyle='#f6f7fa';ctx.fillRect(0,0,width,canvas.height);
 const line=(text:string,y:number,size=24,color='#1c2c42')=>{ctx.fillStyle=color;ctx.font=`${size}px sans-serif`;let value=text;while(ctx.measureText(value).width>950)value=value.slice(0,-2)+'…';ctx.fillText(value,64,y);};
 line('LegendStudy LAB',78,30);line('나의 논술 성장',140,44);line(`첨삭 완료 ${data.completed}회`,200,28);
 let y=250;for(const t of data.titles){line(t,y);y+=40;}
 if(!data.series.length)line('비교 가능한 평가 기록이 모이면 성장 변화를 보여드려요.',y+40,24);
 for(const series of data.series){y+=55;line(series.title,y,26);y+=35;
  series.bars.forEach((bar,index)=>{
   const x=64+(index%3)*320,top=y+Math.floor(index/3)*340,base=top+250;
   ctx.fillStyle='#1c2c42';ctx.font='bold 21px sans-serif';
   let row='',rowY=top;for(const char of bar.name){if(ctx.measureText(row+char).width>280){ctx.fillText(row,x,rowY);row='';rowY+=27;}row+=char;}ctx.fillText(row,x,rowY);
   ctx.font='18px sans-serif';
   for(let n=0;n<=5;n++){const gy=base-n*32;ctx.strokeStyle='#dfe5ed';ctx.beginPath();ctx.moveTo(x+28,gy);ctx.lineTo(x+280,gy);ctx.stroke();ctx.fillStyle='#65738a';ctx.fillText(String(n),x,gy+6);}
   [['최초',bar.before,'#8292a7'],['최근',bar.after,'#f5a300']].forEach(([label,value,color],i)=>{const bx=x+65+i*105,h=Number(value)*32;ctx.fillStyle=String(color);ctx.fillRect(bx,base-h,60,h);ctx.fillStyle='#1c2c42';ctx.fillText(String(value),bx+23,base-h-12);ctx.fillText(String(label),bx+12,base+30);});
  });y+=Math.ceil(series.bars.length/3)*340;
 }
 line('lab.legendstudy.com · 같은 평가 기준의 저장 결과',canvas.height-50,20,'#65738a');
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('IMAGE_FAILED')),'image/png'));
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='legendstudy-growth.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
