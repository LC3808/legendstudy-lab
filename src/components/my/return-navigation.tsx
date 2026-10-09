'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
export function ReturnNavigation({href='/essay-lab/',label='논술 LAB 돌아가기'}:{href?:string;label?:string}){
 const router=useRouter();
 function back(){
  // A same-origin referrer is positive evidence of a safe prior page; length alone is not.
  let safe=false;try{safe=!!document.referrer&&new URL(document.referrer).origin===location.origin&&history.length>1;}catch{}
  if(safe)router.back();else router.replace(href);
 }
 return <nav className="my-actions report-controls" aria-label="복귀 경로"><button className="button button--outline" onClick={back}>뒤로가기</button><Link className="button button--outline" href={href}>{label}</Link></nav>;
}
