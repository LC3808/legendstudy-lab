import {betaExpansionCandidates,betaExpansionFor,expansionMathMatches,type BetaExpansionEnvironment} from '../../../src/lib/essay-runtime/beta-expansion';
import {onRequestGet as mathAvailability} from './availability';
import {commerceTestExam,commerceTestScope,examLaunchHold} from '../../../src/lib/essay-runtime/launch-policy';
import partialEvidence from '../../../src/data/essay-partial-exam-release-evidence.json';
import {publicExamScope} from '../../../src/lib/essay-runtime/public-exam-scope';
import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {registryWorkerCredential} from '../../../src/lib/essay-runtime/server/registry-credential';
import {publicCatalog} from '../../../src/lib/essay-runtime/public-discovery';
import {studentPdfForExam} from '../../../src/lib/materials/student-asset';
import evidence from '../../../src/data/essay-whole-exam-release-evidence.json';
import {legendStudySupabaseUrl} from '../../../src/lib/auth-config';
type Env=MathEnvironment & BetaExpansionEnvironment & {ESSAY_COMMERCE_TEST_ENABLED?:string;ESSAY_COMMERCE_RUNTIME_TEST_ENABLED?:string;ESSAY_PUBLIC_EXAMS?:string;ESSAY_EXAM_RUNTIME_ENABLED?:string;ESSAY_REGISTRY_WORKER_JWT?:string};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** Shared discovery only. Whole-exam evidence is pinned, then checked against live
 * public policy, Registry and DB preflight. No Python initialization or Provider. */
export async function onRequestGet({request,env}:{request:Request;env:Env}){
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
 const fail=(status=503)=>reply({version:'essay-public-service-v1',checked:false,code:'PUBLIC_STATUS_UNAVAILABLE'},status);
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
 if(!token)return fail(401);
 const test=commerceTestScope(request.url,env,commerceTestExam.examId);
 if(env.MATH_ORIGIN!==new URL(request.url).origin||(!test&&env.MATH_SUPABASE_URL!==legendStudySupabaseUrl))return fail();
 try{
  // TEST uses its exact reviewed exam, never the Production public allowlist.
  const raw=test?'':(env.ESSAY_PUBLIC_EXAMS??'').trim(),scope=raw?publicExamScope(raw):[];
  if(raw&&!scope.length)throw Error('INVALID_PUBLIC_SCOPE');
  if(scope.length>256||!scope.every(uuid)||new Set(scope).size!==scope.length)throw Error('INVALID_PUBLIC_SCOPE');
  const transport=serverTransport(env),subject=await transport.subject(token,!test);
  const enabled=env.ESSAY_EXAM_RUNTIME_ENABLED==='true'||(test&&env.ESSAY_COMMERCE_RUNTIME_TEST_ENABLED==='true');
  const expansion=test?[]:betaExpansionCandidates.filter(e=>betaExpansionFor(request.url,env,e.examId));
  const candidates=enabled?test?[commerceTestExam]:[...evidence.exams.map(e=>({...e,partial:false})),...partialEvidence.exams.map(e=>({...e,partial:true})),...expansion.filter(e=>!evidence.exams.some(old=>old.examId===e.examId)).map(e=>({...e,partial:false}))].filter(e=>(!examLaunchHold(e.examId)||expansion.some(x=>x.examId===e.examId))&&scope.includes(e.examId)&&e.questionIds.length&&e.questionIds.every(q=>studentPdfForExam(e.examId,q))):[];
  const math=expansion.some(e=>Object.keys(e.mathQuestions).length>0)?await (await mathAvailability({request:new Request(new URL('/api/essay/availability',request.url),{headers:{Authorization:`Bearer ${token}`}}),env})).json():null;
  const universities=new Set<string>(),exams:{examId:string;universityId:string;questionIds:string[]}[]=[];
  if(candidates.length){
   const credential=registryWorkerCredential(env.ESSAY_REGISTRY_WORKER_JWT);
   if(!credential)throw Error('REGISTRY_CREDENTIAL_REQUIRED');
   const session=await transport.rpcRaw('essay_exam_session_ready',{},credential);
   if(session!=='exam-session-v1')throw Error('SESSION_CONTRACT_REQUIRED');
   for(const universityId of new Set(candidates.map(e=>e.universityId))){
    const university=publicCatalog.universities.find(u=>u.universityId===universityId);
    if(!university)throw Error('UNIVERSITY_ID_MISSING');
    const rows=await transport.rpcRaw('essay_browse_catalog',{p_university:university.sourceUniversityId},token);
    if(!Array.isArray(rows))throw Error('INVALID_CATALOG');
    for(const candidate of candidates.filter(e=>e.universityId===universityId)){
     const row=rows.find(r=>r.examId===candidate.examId);
     if(!row||row.universityId!==universityId||!Array.isArray(row.questions)||new Set(row.questions.map((q:{id:string})=>q.id)).size!==row.questions.length||new Set(candidate.questionIds).size!==candidate.questionIds.length||!candidate.questionIds.every(id=>row.questions.some((q:{id:string})=>q.id===id))||(!candidate.partial&&row.questions.length!==candidate.questionIds.length))throw Error('WHOLE_EXAM_CHANGED');
     const expanded=expansion.find(e=>e.examId===candidate.examId);
     if(expanded&&Object.keys(expanded.mathQuestions).length>0&&(!math?.checked||math.types?.math!==true||!expansionMathMatches(expanded,math.mathQuestions)))continue;
     // Standalone Math uses its canonical source/profile/catalog admission; the
     // Essay preflight remains authoritative for humanities and mixed parents.
     if(expanded?.mode!=='math'){
      const policy=await transport.rpcRaw('essay_exam_preflight',{p_subject:subject,p_exam:candidate.examId},credential);
      if(policy?.package_digest!==candidate.packageDigest)throw Error('RELEASE_EVIDENCE_CHANGED');
     }
     universities.add(universityId);exams.push({examId:candidate.examId,universityId,questionIds:candidate.questionIds});
    }
   }
  }
  return reply({version:'essay-public-service-v1',checked:true,basis:test?'isolated-owner-review-policy':'whole-exam-public-policy-with-owner-exceptions',universityIds:[...universities].sort(),exams});
 }catch{return fail();}
}
