"use client";
import {createContext,useContext,useState,type ReactNode} from 'react';
const Disclosure=createContext(false);
/** Deny generated prose by default; never attempt to redact an unknown answer with regex. */
export function AnswerDisclosure({children,required=true}:{children:ReactNode;required?:boolean}) {
 const inherited=useContext(Disclosure), [requested,setRequested]=useState(false);
 if(!required)return <>{children}</>;
 if(inherited||requested)return <Disclosure.Provider value={true}>{children}</Disclosure.Provider>;
 return <section aria-label="정답 공개 제어"><p>상세 평가에는 정답 수치·최종 수식·참고 풀이가 포함될 수 있습니다. 먼저 직접 수정해 보세요.</p><button type="button" onClick={()=>setRequested(true)}>정답 포함 상세 평가 공개</button></section>;
}
