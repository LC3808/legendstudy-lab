import {reviewedWorkerBinding,type WorkerEnvironment} from '../../../src/lib/essay-runtime/server/worker-binding';
import {essayEvaluationGateway} from '../../../src/lib/essay-runtime/server/gateway';
import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {parseEssayStatus} from '../../../src/lib/essay-runtime/client';
import {boundedBody} from '../../../src/lib/math-release/server/request';
type Environment=MathEnvironment&WorkerEnvironment&{ESSAY_REVIEWED_RUNTIME_ENABLED?:string};
export async function onRequestPost({request,env}:{request:Request;env:Environment}){
 if(env.ESSAY_REVIEWED_RUNTIME_ENABLED!=='true')return Response.json({code:'EVALUATION_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});
 try{
  const worker=reviewedWorkerBinding(env);if(!worker)throw Error('WORKER_UNAVAILABLE');
  const transport=serverTransport(env);
  return essayEvaluationGateway({enabled:true,origin:env.MATH_ORIGIN??'',authenticate:async token=>!!await transport.subject(token),worker,
   ownedAttempt:async(token,id)=>{
    const response=await transport.request(`/rest/v1/essay_attempts?id=eq.${id}&select=id,question_metadata_version,essay_practice_sessions!inner(question_id)`,token);
    if(!response.ok)return null;
    const rows=JSON.parse(new TextDecoder().decode(await boundedBody(response,4096)));
    if(!Array.isArray(rows)||rows.length!==1||rows[0].id!==id||typeof rows[0].essay_practice_sessions?.question_id!=='string'||typeof rows[0].question_metadata_version!=='string')return null;
    return {questionId:rows[0].essay_practice_sessions.question_id,metadataVersion:rows[0].question_metadata_version};
   },releasedFailure:async(token,attempt,evaluation)=>{
    const response=await transport.request(`/rest/v1/essay_evaluations?id=eq.${evaluation}&attempt_id=eq.${attempt}&select=id,attempt_id,status`,token);
    if(!response.ok)return false;
    const rows=JSON.parse(new TextDecoder().decode(await boundedBody(response,4096)));
    if(!Array.isArray(rows)||rows.length!==1||rows[0].id!==evaluation||rows[0].attempt_id!==attempt||rows[0].status!=='failed')return false;
    const state=parseEssayStatus(await transport.rpcRaw('essay_evaluation_status',{p_evaluation:evaluation},token));
    return state.state==='failed'&&state.no_credit_consumed;
   },requestEvaluation:(token,args)=>transport.rpcRaw('essay_request_evaluation',args,token),
  })(request);
 }catch{return Response.json({code:'EVALUATION_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
