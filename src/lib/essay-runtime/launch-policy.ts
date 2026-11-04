import holds from '../../data/essay-launch-holds.json';
/** Exact Registry identities; never infer an evaluator from a university name. */
export function examLaunchHold(examId:unknown){return typeof examId==='string'?holds.exams.find(e=>e.examId===examId)?.reason:undefined;}

/** Owner-approved isolated review scope. Production holds remain unchanged. */
export function commerceTestScope(requestUrl:string,env:{ESSAY_COMMERCE_TEST_ENABLED?:string;MATH_PROJECT_REF?:string;MATH_SUPABASE_URL?:string},examId:unknown){
 return env.ESSAY_COMMERCE_TEST_ENABLED==='true'&&new URL(requestUrl).origin==='https://legendstudy-task16b.pages.dev'&&
  env.MATH_PROJECT_REF==='kpqbedylxlyntrrfybpn'&&env.MATH_SUPABASE_URL==='https://kpqbedylxlyntrrfybpn.supabase.co'&&examId==='e8ea5bb3-0956-5fd6-b90e-4b7fb350b2f9';
}

// Review candidate metadata is not production release/E2E evidence.
export const commerceTestExam={examId:'e8ea5bb3-0956-5fd6-b90e-4b7fb350b2f9',universityId:'1090e1be-174e-5042-abd3-ca929c6e26f8',questionIds:['57a2115d-bc34-505e-8a29-b7a4bfdf2a41','2884b1ef-8274-5ccf-8377-a5f255355f39'],packageDigest:'1c78d376397c61632f68fdb9d9022ebb9168bf8b37b4b3b53c24c9a811f43474',partial:false};
