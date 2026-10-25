'use client';
import unitMap from '@/data/essay-response-units.json';

/** Subanswers retain one parent question ID and its existing text submission. */
export function EssayResponseEditor({questionId,id,label,value,disabled,onChange,rows}:{questionId?:string|null;id:string;label:string;value:string;disabled:boolean;onChange:(value:string)=>void;rows:number}){
 const units=questionId?(unitMap as Record<string,string[]>)[questionId]:undefined;
 const marker=(unit:string)=>`[소문항 ${unit}]\n`;
 // Existing unstructured drafts remain editable as-is; never split destructively.
 const structured=units&&(!value||units.some(unit=>value.startsWith(marker(unit))));
 if(!structured)return <><label htmlFor={id}>{label}</label><textarea id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)} maxLength={30000} rows={rows}/></>;
 const values=units.map(unit=>{const start=value.indexOf(marker(unit));if(start<0)return '';const from=start+marker(unit).length;const next=units.map(other=>value.indexOf(marker(other),from)).filter(n=>n>=0);return value.slice(from,next.length?Math.min(...next):undefined).replace(/\n\n$/,'');});
 function change(index:number,text:string){const next=values.map((v,i)=>i===index?text:v).map((v,i)=>v.trim()?marker(units![i])+v:'').filter(Boolean).join('\n\n');if(next.length<=30000)onChange(next);}
 return <fieldset disabled={disabled}><legend>{label}</legend>{units.map((unit,i)=><div key={unit}><label htmlFor={`${id}-${i}`}>{label} {unit}</label><textarea id={`${id}-${i}`} value={values[i]} rows={7} maxLength={30000} onChange={e=>change(i,e.target.value)}/></div>)}</fieldset>;
}
