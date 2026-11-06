import {describe,it,expect,vi} from 'vitest';
import {betaExpansionCandidates,expansionMathMatches} from './beta-expansion';
import {onRequestPost} from '../../../functions/api/essay/exam';
let catalog:any[]=[];
vi.mock('../math-release/server/transport',()=>({serverTransport:()=>({subject:async()=> 'synthetic-ordinary-user'}),publicMathLeaves:()=>[]}));
vi.mock('../../../functions/api/essay/availability',()=>({onRequestGet:async()=>Response.json({checked:true,types:{math:true},mathQuestions:catalog})}));
const origin='https://lab.legendstudy.com';
for(const [examId,count] of [['25dc068b-4672-56e1-b8df-08ee8800e2f6',4],['0a331c3e-d46b-5af3-b787-e3342e8a1ae8',3],['4680d613-8b1f-57f2-aff6-36a084a8a59f',4],['7f0d0a2f-7c38-5b7f-8987-91afc1773321',4],['91d3f4ec-72ea-5031-bcbc-fb7fa7ba47af',4],['dd68fa7b-67a5-5b76-9ce6-39b44efeb079',4],['23ff598d-4abb-5483-9ac3-a12c7e5ce09c',4],['7484fbea-4c68-5285-b525-227f835ca4cc',3]] as const){
 describe(`TASK20 ${examId}`,()=>{
  const e=betaExpansionCandidates.find(e=>e.examId===examId)!;
  const rows=()=>Object.entries(e.mathQuestions).map(([questionId,leafId])=>({examId,questionId,leafId}));
  const env={MATH_ORIGIN:origin,MATH_PROJECT_REF:'stlhijzpjfgwwdgunlsd',MATH_SUPABASE_URL:'https://stlhijzpjfgwwdgunlsd.supabase.co',ESSAY_PUBLIC_EXAMS:examId,ESSAY_BETA_EXPANSION_EXAMS:examId,ESSAY_EXAM_RUNTIME_ENABLED:'true'};
  const request=()=>new Request(origin+'/api/essay/exam',{method:'POST',headers:{Authorization:'Bearer synthetic',Origin:origin},body:JSON.stringify({action:'availability',examId})});
  it('ordinary APP/WEB gateway admits the entire exact question set',async()=>{
   catalog=rows();const response=await onRequestPost({request:request(),env});const dto=await response.json();
   expect(dto.ready).toBe(true);expect(dto.questionIds).toHaveLength(count);expect(dto.mathQuestions).toEqual(e.mathQuestions);
  });
  it('does not label a partial server catalog as a complete exam',async()=>{
   for(let missing=0;missing<count;missing++){
    catalog=rows().filter((_,i)=>i!==missing);
    expect(expansionMathMatches(e,catalog)).toBe(false);
    const dto=await (await onRequestPost({request:request(),env})).json();expect(dto.ready).toBe(false);expect(dto.questionIds).toEqual([]);
   }
  });
 });
}
