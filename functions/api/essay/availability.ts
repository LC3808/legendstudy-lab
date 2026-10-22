import { serverTransport, type MathEnvironment } from '../../../src/lib/math-release/server/transport';
export type Availability = { version:'essay-web-v1'; catalog?: {math:boolean}; types: {humanities_social:boolean;business_economics:boolean;math:boolean;science:boolean} };
const disabled = ():Availability=>({version:'essay-web-v1',catalog:{math:false},types:{humanities_social:false,business_economics:false,math:false,science:false}});
function currentRole(token:string|undefined,role:string):boolean {
  try { const payload=JSON.parse(atob(token!.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return payload.role===role&&Number.isFinite(payload.exp)&&payload.exp>Date.now()/1000+60; } catch {return false;}
}
/** Read only. No provider calls/reservations. Opaque to visitors; no config or subject disclosure. */
export async function onRequestGet({request,env}:{request:Request;env:MathEnvironment}) {
  const state=disabled();
  const reply=()=>Response.json(state,{headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
  const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
  if(!token)return reply();
  if(env.MATH_ORIGIN!==new URL(request.url).origin)return reply();
  try {
    const transport=serverTransport(env);await transport.subject(token);
    // Existing allowlisted operator only. Null DTOs cannot claim work or charge Credit.
    if(new URL(request.url).searchParams.get('probe')==='worker-auth') {
      const checks=[];
      for(const [role,credential,own,other] of [
        ['math_extraction_worker',env.MATH_EXTRACTION_WORKER_JWT,'math_extraction','math_evaluation'],
        ['math_evaluation_worker',env.MATH_EVALUATION_WORKER_JWT,'math_evaluation','math_extraction'],
      ] as const) {
        const current=currentRole(credential,role);
        const results=[];
        if(credential) for(const rpc of [own,other]) {
          const response=await transport.request(`/rest/v1/rpc/${rpc}`,credential,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_request:null})});
          let code='unknown';
          try {const data=await response.json() as {code?:string};if(typeof data.code==='string'&&/^[A-Z0-9]{5,12}$/.test(data.code))code=data.code;}catch{}
          results.push({rpc,status:response.status,code});
        }
        checks.push({role,credentialPresent:!!credential,current,results});
      }
      return Response.json({version:'math-worker-auth-probe-v1',checks},{headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
    }
    const catalog=await transport.rpcRaw('math_catalog',{p_limit:1},token);
    state.catalog={math:Array.isArray(catalog)&&catalog.length>0};
    if(env.MATH_ENABLED!=='true'||env.MATH_PROVIDER_CALLS_ENABLED!=='true'||env.MATH_PROVIDER!=='OPENAI'||!env.MATH_PRIMARY_MODEL||!env.MATH_PROVIDER_API_KEY||
      !currentRole(env.MATH_EXTRACTION_WORKER_JWT,'math_extraction_worker')||!currentRole(env.MATH_EVALUATION_WORKER_JWT,'math_evaluation_worker'))return reply();
    const status=await transport.rpcRaw('essay_web_runtime_status',{},token);
    if(status?.version!=='essay-web-runtime-v1'||status.math_evaluations_enabled!==true)return reply();
    state.types.math=state.catalog.math;
  } catch { /* Missing migration, closed lifecycle, network and configuration all remain unavailable. */ }
  // Humanities worker/review binding, economics mixed atomic orchestration and science engine
  // have no verified Production integration. Never infer these from an exam's label.
  return reply();
}
