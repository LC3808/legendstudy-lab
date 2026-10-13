export const checks={university:'대학 일치',year:'학년도 일치',kind:'시험 유형 일치',track:'계열 일치',sessionCampus:'회차·캠퍼스 일치',question:'문항 번호 일치',passages:'제시문 연결 확인',questionPages:'문제 페이지 확인',visuals:'이미지·수식 확인',length:'요구 분량 확인',intent:'출제의도 유무·연결 확인',explanation:'해설 유무·연결 확인',criteria:'평가기준 유무·연결 확인',modelAnswer:'예시답안 유무·연결 확인',source:'출처 확인',providerRights:'Provider 전송권한 상태 확인',studentRights:'학생 공개 가능 범위 확인'} as const;
export const roles={question:'문제',shared_passage:'공통 제시문',intent:'출제의도',explanation:'해설',criteria:'평가 요소',scoring:'채점기준',model_answer:'예시답안',image:'이미지·수식'} as const;
export type Mapping={questionId:string;sourceHash:string;role:keyof typeof roles;startPage:number;endPage:number;printedPage?:string|null;evidenceText?:string;verification?:'NEEDS_REVIEW'|'VERIFIED'};
export type ReviewBody={documents:string[];mappings:Mapping[];checks:Partial<Record<keyof typeof checks,boolean>>;notes?:string;package?:{package_version:number;package_digest:string;runtime_ready:false;questions:unknown[]};rights?:Record<string,{providerTransmission:string;studentDisplay:string;download:string}>};
export type Review={revision:number;state:string;body:ReviewBody;approvalRequested:boolean};
export type Document={sha256:string;title:string;page_count:number;object_key:string};
export type Detail={examId:string;review:Review;questions:{id:string;label:string;sourceKey:string}[];documents:Document[];history:{revision:number;state:string;created_at:string;reviewer:string|null}[]};
export type ExamRow={examId:string;universityId:string;university:string;year:number;kind:string;track?:string|null;reviewer?:string|null;title:string;questionCount:number;state:string;revision:number;updatedAt:string|null;approvalRequested:boolean};
/** Heuristics generate editable candidates only. Never attest identity or rights. */
export function classifyPages(pages:string[],hash:string):Mapping[]{
 const markers:Partial<Record<keyof typeof roles,RegExp>>={question:/(문제|문항|논제)\s*\d|제시문/,intent:/출제\s*의도/,explanation:/해설|풀이/,criteria:/평가\s*(기준|요소)/,scoring:/채점\s*기준|배점/,model_answer:/(예시|우수|모범)\s*답안/};
 return pages.flatMap((text,i)=>Object.entries(markers).filter(([,re])=>re.test(text)).map(([role])=>({questionId:'',sourceHash:hash,role:role as keyof typeof roles,startPage:i+1,endPage:i+1,evidenceText:text.slice(0,4000),verification:'NEEDS_REVIEW' as const})));
}
