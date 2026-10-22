import {catalogUniversity} from '@/lib/essay-runtime/public-discovery';
import {officialUrl} from '@/lib/essay-runtime/catalog';

/** Public navigation only. Never receives private Storage paths or evidence. */
export function QuestionMaterialAccess({sourceId,year,kind,track,label}:{sourceId:string;year:number;kind:string;track:string;label:string}){
 const university=catalogUniversity(sourceId);
 const sources=university?.researchSources?.filter(s=>officialUrl(s.url))??[];
 return <section aria-label={`${label} 문제 확인`}>
  <p>{year}학년도 · {kind==='mock'?'모의논술':'수시논술'} · {track} · {label}</p>
  <p>이 화면에서 제공할 수 있는 문제 원문이 아직 연결되지 않았습니다.</p>
  {sources.length?<>{sources.map(source=><p key={source.url}><a className="button button--outline" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}에서 문제 확인 ↗</a></p>)}<p>입학처 자료 페이지에서 위 학년도·시험·문항을 확인해 주세요. 이 링크가 선택한 문항의 직접 원문을 뜻하지는 않습니다.</p></>:<p>공식 논술 자료실 링크를 확인 중입니다. 현재 이 화면에서는 문제 원문을 열 수 없습니다.</p>}
 </section>;
}
