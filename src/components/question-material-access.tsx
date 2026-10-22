import {catalogUniversity} from '@/lib/essay-runtime/public-discovery';
/** Missing public text is distinct from private evaluation evidence. */
export function QuestionMaterialAccess({sourceId,year,kind,track,label}:{sourceId:string;year:number;kind:string;track:string;label:string}){
 return <section aria-label={`${label} 문제 확인`}>
  <p>{year}학년도 · {kind==='mock'?'모의논술':kind==='admission'?'수시논술':'시험 유형 확인 중'} · {track} · {label}</p>
  <p>{catalogUniversity(sourceId)?.researchSources?.length ? '문제 원문은 상단 공식 논술 자료에서 확인해 주세요.' : '문제 원문 준비 중'}</p>
 </section>;
}
