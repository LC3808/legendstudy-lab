import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {candidateJson} from '../../../src/lib/math-release/server/provider';
import {boundedBody} from '../../../src/lib/math-release/server/request';
import {cleanSourcePages,extractionPrompt,validateExtraction} from '../../../src/lib/materials/analysis';
import type {Detail,Document,ExamRow} from '../../../src/lib/materials/contract';
export async function onRequestPost({request,env}:{request:Request;env:MathEnvironment}){
 const reply=(code:string,status:number)=>Response.json({code},{status,headers:{'Cache-Control':'no-store'}});
 if(request.headers.get('origin')!==env.MATH_ORIGIN)return reply('ACCESS_DENIED',403);
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)return reply('LOGIN_REQUIRED',401);
 try{
  const transport=serverTransport(env);
  // Existing operator RPC authenticates the JWT and authoritative role. No worker JWT or new grant.
  if(await transport.rpcRaw('is_quality_operator',{},token)!==true)return reply('ACCESS_DENIED',403);
  const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,800000)));
  if(typeof input.examId!=='string'||!Number.isInteger(input.revision))return reply('INVALID_REQUEST',400);
  const detail=await transport.rpcRaw('essay_material_detail',{p_exam:input.examId},token) as Detail;
  if(detail.review.revision!==input.revision)return reply('REVISION_CONFLICT',409);
  const sources=cleanSourcePages(input.sources);
  const docs=await transport.rpcRaw('essay_material_documents',{},token) as Document[];
  for(const source of sources){
   if(!detail.review.body.documents.includes(source.sourceHash)||!docs.some(d=>d.sha256===source.sourceHash&&d.page_count===source.pages.length))return reply('SOURCE_NOT_LINKED',409);
   if(detail.review.body.rights?.[source.sourceHash]?.providerTransmission!=='APPROVED')return reply('PROVIDER_RIGHTS_REQUIRED',409);
  }
  const exam=(await transport.rpcRaw('essay_material_list',{},token) as ExamRow[]).find(e=>e.examId===detail.examId);
  if(!exam)return reply('EXAM_NOT_FOUND',404);
  if(env.MATH_PROVIDER_CALLS_ENABLED!=='true'||env.MATH_PROVIDER!=='OPENAI'||!env.MATH_PRIMARY_MODEL||!env.MATH_PROVIDER_API_KEY)return reply('PROVIDER_UNAVAILABLE',503);
  const raw=await candidateJson({enabled:true,model:env.MATH_PRIMARY_MODEL,key:env.MATH_PROVIDER_API_KEY},extractionPrompt,{exam,questions:detail.questions,sources});
  return Response.json({...validateExtraction(raw,detail,sources),revision:input.revision},{headers:{'Cache-Control':'no-store'}});
 }catch{return reply('ANALYSIS_FAILED',422);}
}
