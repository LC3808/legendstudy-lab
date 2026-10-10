import {readReviewedAdmission,type ReviewedWorkerBinding} from '../../../src/lib/essay-runtime/server/gateway';
import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {boundedBody} from '../../../src/lib/math-release/server/request';
type Environment=MathEnvironment&{ESSAY_REVIEWED_RUNTIME_ENABLED?:string;ESSAY_REVIEWED_WORKER?:ReviewedWorkerBinding};
export async function onRequestPost({request,env}:{request:Request;env:Environment}){
 const reply=(enabled=false)=>Response.json({version:'essay-question-admission-v1',enabled},{headers:{'Cache-Control':'no-store'}});
 if(env.ESSAY_REVIEWED_RUNTIME_ENABLED!=='true'||!env.ESSAY_REVIEWED_WORKER||!env.MATH_ORIGIN||request.headers.get('origin')!==env.MATH_ORIGIN)return reply();
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];if(!token)return reply();
  const transport=serverTransport(env);await transport.subject(token);
  const body=JSON.parse(new TextDecoder().decode(await boundedBody(request,200)));
  if(!body||Object.keys(body).join()!=='question_id'||typeof body.question_id!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(body.question_id))return reply();
  const response=await transport.request(`/rest/v1/essay_questions?id=eq.${body.question_id}&is_published=eq.true&select=id,metadata_version`,token);
  if(!response.ok)return reply();const rows=JSON.parse(new TextDecoder().decode(await boundedBody(response,4096)));
  if(!Array.isArray(rows)||rows.length!==1||rows[0].id!==body.question_id||typeof rows[0].metadata_version!=='string')return reply();
  return reply(!!await readReviewedAdmission(env.ESSAY_REVIEWED_WORKER,{questionId:rows[0].id,metadataVersion:rows[0].metadata_version}));
 }catch{return reply();}
}
