import {serverTransport, type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {onRequestGet as mathAvailability} from './availability';
import {publicCatalog} from '../../../src/lib/essay-runtime/public-discovery';
import {legendStudySupabaseUrl} from '../../../src/lib/auth-config';
type Env=MathEnvironment & {ESSAY_PUBLIC_EXAMS?:string;ESSAY_EXAM_RUNTIME_ENABLED?:string};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** Discovery only: server release policy + existing public metadata. Never call
 * Python admission/evaluation. Submission retains its independent authorization. */
export async function onRequestGet({request,env}:{request:Request;env:Env}){
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
 const fail=(status=503)=>reply({version:'essay-public-service-v1',checked:false,code:'PUBLIC_STATUS_UNAVAILABLE'},status);
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
 if(!token)return fail(401);
 if(env.MATH_ORIGIN!==new URL(request.url).origin||env.MATH_SUPABASE_URL!==legendStudySupabaseUrl)return fail();
 try{
  const scope=(env.ESSAY_PUBLIC_EXAMS??'').trim();
  const ids=scope?scope.split(',').map(v=>v.trim()):[];
  if(ids.length>42||!ids.every(uuid)||new Set(ids).size!==ids.length)throw Error('INVALID_PUBLIC_SCOPE');
  const transport=serverTransport(env);await transport.subject(token,true);
  const released=new Set(env.ESSAY_EXAM_RUNTIME_ENABLED==='true'?ids:[]);
  // Existing math catalog/status RPCs; this does not initialize a Python Worker.
  const mathResponse=await mathAvailability({request,env});
  const math=await mathResponse.json() as {checked?:boolean;mathQuestions?:{examId:string;questionId:string}[]};
  if(!mathResponse.ok||math.checked!==true)throw Error('MATH_STATUS_UNAVAILABLE');
  const mathIds=new Map<string,Set<string>>();
  for(const q of math.mathQuestions??[]){if(!uuid(q.examId)||!uuid(q.questionId))throw Error('INVALID_MATH_ID');const set=mathIds.get(q.examId)??new Set<string>();set.add(q.questionId);mathIds.set(q.examId,set);}
  const universities=new Set<string>(),found=new Set<string>();
  if(released.size||mathIds.size)for(let offset=0;offset<publicCatalog.universities.length;offset+=6){
   await Promise.all(publicCatalog.universities.slice(offset,offset+6).map(async university=>{
    const rows=await transport.rpcRaw('essay_browse_catalog',{p_university:university.sourceUniversityId},token);
    if(!Array.isArray(rows))throw Error('INVALID_CATALOG');
    for(const row of rows){
     if(!released.has(row.examId)&&!mathIds.has(row.examId))continue;
     if(!uuid(row.examId)||!uuid(row.universityId)||(university.universityId&&row.universityId!==university.universityId)||!Array.isArray(row.questions)||!row.questions.length||row.questions.some((q:{id:unknown})=>!uuid(q.id)))throw Error('INVALID_RELEASE_METADATA');
     if(mathIds.has(row.examId)&&![...mathIds.get(row.examId)!].every(id=>row.questions.some((q:{id:string})=>q.id===id)))throw Error('INVALID_MATH_METADATA');
     found.add(row.examId);universities.add(row.universityId);
    }
   }));
  }
  if([...released,...mathIds.keys()].some(id=>!found.has(id)))throw Error('RELEASE_METADATA_MISSING');
  return reply({version:'essay-public-service-v1',checked:true,basis:'server-public-policy',universityIds:[...universities].sort()});
 }catch{return fail();}
}
