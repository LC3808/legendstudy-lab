import registry from '../../../src/data/essay-source-registry.json';
import {publicCatalog as catalog} from '../../../src/lib/essay-runtime/public-discovery';
import {officialUrl} from '../../../src/lib/essay-runtime/catalog';
import {connectPublishedQuestions} from '../../../src/lib/essay-runtime/canonical-catalog';
import {legendStudySupabaseUrl} from '../../../src/lib/auth-config';
import {boundedBody} from '../../../src/lib/math-release/server/request';
import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import type {SourceExam} from '../../../src/lib/essay-runtime/source-registry';
/** Shared public metadata; anonymous RLS only, no worker/user credentials. */
export async function onRequestGet(context?:{env:MathEnvironment}){
 let exams=registry.exams as SourceExam[];
 const env=context?.env;
 if(env?.MATH_SUPABASE_URL===legendStudySupabaseUrl&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.MATH_SUPABASE_PUBLISHABLE_KEY??'')){
  try{
   const query='/rest/v1/essay_questions?is_published=eq.true&question_key=like.source%3A*&select=id,essay_exam_id,question_key,metadata_version,essay_exams!inner(university_id,admission_year,exam_kind)&limit=1000';
   const response=await fetch(legendStudySupabaseUrl+query,{headers:{apikey:env.MATH_SUPABASE_PUBLISHABLE_KEY!},redirect:'error',signal:AbortSignal.timeout(3000)});
   if(response.ok)exams=connectPublishedQuestions(exams,JSON.parse(new TextDecoder().decode(await boundedBody(response,524288))));
  }catch{/* Preserve source-only drafting; never infer canonical/evaluation readiness. */}
 }
 return Response.json({...registry,exams,universities:catalog.universities.filter(u=>registry.coverage.some(c=>c.sourceUniversityId===u.sourceUniversityId)).map(u=>({sourceUniversityId:u.sourceUniversityId,universityId:u.universityId,name:u.name,officialSourceUrl:u.researchSources?.map(s=>officialUrl(s.url)).find(Boolean)??u.offerings.flatMap(o=>o.sources).map(officialUrl).find(Boolean)??null}))},{headers:{'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
}

/** Private registration does not publish questions or authorize drafting/evaluation.
 * Native bearer clients may omit Origin; browser callers must use our exact origin.
 * The existing Auth allowlist is checked before the narrow worker RPC is called.
 */
export async function onRequestPost({request,env}:{request:Request;env:MathEnvironment&{ESSAY_REGISTRY_WORKER_JWT?:string}}){
 const headers={'Cache-Control':'private, no-store','Vary':'Authorization, Origin','X-Content-Type-Options':'nosniff'};
 const unavailable=()=>Response.json({code:'REGISTRY_UNAVAILABLE'},{status:503,headers});
 if(!env.ESSAY_REGISTRY_WORKER_JWT||env.MATH_SUPABASE_URL!==legendStudySupabaseUrl)return unavailable();
 const origin=request.headers.get('origin');
 if(origin&&origin!==env.MATH_ORIGIN)return Response.json({code:'ACCESS_DENIED'},{status:403,headers});
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
 if(!token)return Response.json({code:'LOGIN_REQUIRED'},{status:401,headers});
 try{
  const transport=serverTransport(env);
  const subject=await transport.subject(token);
  const rows=await transport.rpcRaw('essay_registered_questions',{p_subject:subject},env.ESSAY_REGISTRY_WORKER_JWT);
  const exams=connectPublishedQuestions(registry.exams as SourceExam[],rows,true);
  const response=await onRequestGet();const base=await response.json() as Record<string,unknown>;
  return Response.json({...base,exams},{headers});
 }catch{return unavailable();}
}
