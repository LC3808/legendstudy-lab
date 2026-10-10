import { boundedBody } from './request';
import type { MathRpcTransport } from '../../math-input/runtime/transport';
export interface RecoveryPorts {
  enabled: boolean;
  origin: string;
  authenticate(token: string): Promise<boolean>;
  student(token: string): MathRpcTransport;
  recover(evaluationId: string): Promise<unknown>;
}
const reply=(status:number,code:string)=>Response.json({code},{status,headers:{'Cache-Control':'no-store'}});
/** Reconcile only the authenticated owner's existing job. SQL owns expiry, locks and settlement. */
export function recoveryGateway(ports:RecoveryPorts){
 return async(request:Request):Promise<Response>=>{
  if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
  if(!ports.enabled)return reply(503,'RECOVERY_UNAVAILABLE');
  if(!ports.origin||request.headers.get('origin')!==ports.origin)return reply(403,'ACCESS_DENIED');
  const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
  if(!token)return reply(401,'LOGIN_REQUIRED');
  try{
   if(!await ports.authenticate(token))return reply(401,'LOGIN_REQUIRED');
   const payload=JSON.parse(new TextDecoder().decode(await boundedBody(request,200)));
   if(!payload||Object.keys(payload).join()!=='evaluation_id'||typeof payload.evaluation_id!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(payload.evaluation_id))return reply(400,'INVALID_REQUEST');
   const read=async()=>{
    const wire=await ports.student(token).rpc('math_learning',{dto_version:'math-learning-v1',action:'read_learning_state',payload});
    const state=(wire as {result?:{evaluation_id?:string;evaluation_state?:string;valid_evaluation_available?:boolean}})?.result;
    if(!state||state.evaluation_id!==payload.evaluation_id)throw Error('OWNER_DENIED');
    return state;
   };
   const before=await read();
   if(!['REQUESTED','PROCESSING'].includes(before.evaluation_state??''))return reply(200,'STATUS_UNCHANGED');
   const recovered=await ports.recover(payload.evaluation_id);
   if(typeof recovered!=='boolean')throw Error('INVALID_RESPONSE');
   // A successful RPC alone is not a client-side claim about Credit release.
   const after=await read();
   return reply(200,recovered&&after.evaluation_state==='FAILED'?'RECOVERED':'STATUS_UNCHANGED');
  }catch{return reply(409,'RETRY_STATUS_CHECK');}
 };
}
