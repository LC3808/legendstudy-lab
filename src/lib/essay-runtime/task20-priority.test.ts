import {describe,it,expect,vi} from 'vitest';
import {betaExpansionCandidates,expansionMathMatches} from './beta-expansion';
import {onRequestPost} from '../../../functions/api/essay/exam';
let catalog:any[]=[];
vi.mock('../math-release/server/transport',()=>({serverTransport:()=>({subject:async()=> 'synthetic-ordinary-user'}),publicMathLeaves:()=>[]}));
vi.mock('../../../functions/api/essay/availability',()=>({onRequestGet:async()=>Response.json({checked:true,types:{math:true},mathQuestions:catalog})}));
const origin='https://lab.legendstudy.com';
for(const [examId,count] of [['0723cb5a-6061-514d-9e2e-968662ea180f',4],['1b7f6944-0de5-5e61-bbcb-f44c78d61dac',3],['25b00850-70b1-594d-93b4-b124701faf5c',4],['2f7d8e9a-28d4-566c-b69a-09c0bdc01738',3],['30c84aee-1dcb-5d20-8c98-e25b1d8670d2',4],['43202ccc-d561-577f-9385-3eb80d8c6d3f',4],['48f194ed-202f-5788-962c-cb259317157a',3],['66f3816a-221e-5bf8-9486-bf69cec2e216',3],['66fa2252-0e8a-5f29-985a-c50adafa7dce',4],['76ae9d8e-7613-5d56-84a1-167ce31ecb14',4],['7bc501df-6c12-5e13-82ad-ce487947f5f9',3],['7def3132-0356-5e18-be98-895637c20e6e',3],['8174f3c1-879c-582f-8a88-f658286c5b9b',4],['866d1793-bbb5-5991-96e8-e52c2c99b2cd',4],['8842d967-e841-5296-a9d1-1bf24c78f6f7',3],['bbd2b0a2-b1b6-5956-87fc-aa1cfa08a404',3],['be701bb5-5647-5465-a338-1119dc0e064f',3],['bfe00753-a4bf-5857-8a39-056907969d23',3],['e484b585-d3ac-56d5-9c2c-7b604f28299d',4],['ee5df319-a4f8-5840-a1c2-02136655512d',3],['25dc068b-4672-56e1-b8df-08ee8800e2f6',4],['0a331c3e-d46b-5af3-b787-e3342e8a1ae8',3],['4680d613-8b1f-57f2-aff6-36a084a8a59f',4],['7f0d0a2f-7c38-5b7f-8987-91afc1773321',4],['91d3f4ec-72ea-5031-bcbc-fb7fa7ba47af',4],['dd68fa7b-67a5-5b76-9ce6-39b44efeb079',4],['23ff598d-4abb-5483-9ac3-a12c7e5ce09c',4],['7484fbea-4c68-5285-b525-227f835ca4cc',3]] as const){
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
