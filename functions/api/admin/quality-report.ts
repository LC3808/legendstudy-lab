import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import report from '../../_data/quality-report.json';
/** Report body never enters a public static asset or client module. */
export async function onRequestGet({request,env}:{request:Request;env:MathEnvironment}) {
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization, Origin','X-Content-Type-Options':'nosniff'}});
 const origin=request.headers.get('origin');
 if(origin&&origin!==env.MATH_ORIGIN)return reply({code:'ACCESS_DENIED'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
 if(!token)return reply({code:'LOGIN_REQUIRED'},401);
 try {
  const response=await serverTransport(env).request('/rest/v1/rpc/is_quality_operator',token,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)return reply({code:response.status===401?'LOGIN_REQUIRED':response.status===403?'ACCESS_DENIED':'AUTHORIZATION_UNAVAILABLE'},response.status===401?401:response.status===403?403:503);
  if(await response.json()!==true)return reply({code:'ACCESS_DENIED'},403);
  return reply(report);
 }catch{return reply({code:'AUTHORIZATION_UNAVAILABLE'},503);}
}
