import holds from '../../data/essay-launch-holds.json';
/** Exact Registry identities; never infer an evaluator from a university name. */
export function examLaunchHold(examId:unknown){return typeof examId==='string'?holds.exams.find(e=>e.examId===examId)?.reason:undefined;}

/** Owner-approved isolated review scope. Production holds remain unchanged. */
export function commerceTestScope(requestUrl:string,env:{ESSAY_COMMERCE_TEST_ENABLED?:string;MATH_PROJECT_REF?:string;MATH_SUPABASE_URL?:string},examId:unknown){
 return env.ESSAY_COMMERCE_TEST_ENABLED==='true'&&new URL(requestUrl).origin==='https://legendstudy-task16b.pages.dev'&&
  env.MATH_PROJECT_REF==='kpqbedylxlyntrrfybpn'&&env.MATH_SUPABASE_URL==='https://kpqbedylxlyntrrfybpn.supabase.co'&&examId==='e8ea5bb3-0956-5fd6-b90e-4b7fb350b2f9';
}
