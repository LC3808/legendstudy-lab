import manifest from '../../data/essay-beta-expansion.json';
import {publicExamScope} from './public-exam-scope';
export type BetaExpansion = {examId:string;universityId:string;questionIds:string[];catalogQuestionIds?:string[];packageDigest:string;label:string;mode:string;mathQuestions:Record<string,string>};
export type BetaExpansionEnvironment = {ESSAY_BETA_EXPANSION_EXAMS?:string;ESSAY_PUBLIC_EXAMS?:string;MATH_PROJECT_REF?:string;MATH_SUPABASE_URL?:string;MATH_ORIGIN?:string};
export const betaExpansionCandidates:BetaExpansion[]=manifest.exams.map(e=>({...e,mathQuestions:Object.fromEntries(Object.entries(e.mathQuestions).filter((entry):entry is [string,string]=>typeof entry[1]==='string'))}));
/** Metadata never activates a route. Exact Production project, public policy and
 * an explicit bounded rollout scope are all required before live admission. */
export function betaExpansionFor(requestUrl:string,env:BetaExpansionEnvironment,examId:unknown):BetaExpansion|undefined{
 if(new URL(requestUrl).origin!=='https://lab.legendstudy.com'||env.MATH_ORIGIN!=='https://lab.legendstudy.com'||env.MATH_PROJECT_REF!=='stlhijzpjfgwwdgunlsd'||env.MATH_SUPABASE_URL!=='https://stlhijzpjfgwwdgunlsd.supabase.co'||typeof examId!=='string')return;
 const scope=publicExamScope(env.ESSAY_BETA_EXPANSION_EXAMS);
 if(!scope.length||scope.some(id=>!betaExpansionCandidates.some(e=>e.examId===id))||!scope.includes(examId)||!publicExamScope(env.ESSAY_PUBLIC_EXAMS).includes(examId))return;
 return betaExpansionCandidates.find(e=>e.examId===examId);
}
export function expansionMathMatches(candidate:BetaExpansion,rows:unknown):boolean{
 if(!Array.isArray(rows))return false;
 return Object.entries(candidate.mathQuestions).every(([question,leaf])=>rows.filter(row=>row?.examId===candidate.examId&&row?.questionId===question&&row?.leafId===leaf).length===1);
}
