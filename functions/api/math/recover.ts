import { recoveryGateway } from '../../../src/lib/math-release/server/recovery';
import { serverTransport, type MathEnvironment } from '../../../src/lib/math-release/server/transport';
/** Independently gated: recovery must remain possible when new evaluations are switched off. */
export async function onRequestPost({request,env}:{request:Request;env:MathEnvironment}){
 if(env.MATH_RECOVERY_ENABLED!=='true'||!env.MATH_EVALUATION_WORKER_JWT)return Response.json({code:'RECOVERY_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});
 try{
  const transport=serverTransport(env);
  return recoveryGateway({enabled:true,origin:env.MATH_ORIGIN??'',authenticate:async token=>!!await transport.subject(token),student:transport.rpc,
   recover:id=>transport.rpcRaw('math_recover_evaluation',{p_id:id},env.MATH_EVALUATION_WORKER_JWT!),
  })(request);
 }catch{return Response.json({code:'RECOVERY_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
