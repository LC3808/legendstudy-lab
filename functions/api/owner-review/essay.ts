/** Isolated Owner review: verified session + DB operator gate, fixed read RPC only. */
type Env={NEXT_PUBLIC_SUPABASE_URL?:string;NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?:string};
const origin='https://lab.legendstudy.com';
const headers={'Content-Type':'application/json','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Vary':'Authorization','X-Content-Type-Options':'nosniff'};
export async function handleOwnerReview(request:Request,env:Env,fetcher:typeof fetch=fetch):Promise<Response>{
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method!=='GET')return reply({code:'METHOD_NOT_ALLOWED'},405);
 if(new URL(request.url).origin!==origin||(request.headers.has('Origin')&&request.headers.get('Origin')!==origin))return reply({code:'FORBIDDEN'},403);
 const auth=request.headers.get('Authorization');
 if(!auth?.startsWith('Bearer ')||auth.length>8192)return reply({code:'LOGIN_REQUIRED'},401);
 const url=new URL(request.url),run=url.searchParams.get('run'),feedback=url.searchParams.get('feedback');
 if([...url.searchParams.keys()].some(k=>k!=='run'&&k!=='feedback')||(run!==null&&feedback!==null)||(feedback!==null&&!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(feedback))||(run!==null&&!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(run)))return reply({code:'INVALID_REQUEST'},400);
 if(env.NEXT_PUBLIC_SUPABASE_URL!=='https://stlhijzpjfgwwdgunlsd.supabase.co'||!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))return reply({code:'CONFIGURATION_UNAVAILABLE'},503);
 const base=env.NEXT_PUBLIC_SUPABASE_URL,h={Authorization:auth,apikey:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
 const call=(path:string,init:RequestInit={})=>fetcher(base+path,{...init,headers:h,signal:AbortSignal.timeout(15000),redirect:'manual'});
 try{
  const user=await call('/auth/v1/user');if(!user.ok)return reply({code:'LOGIN_REQUIRED'},401);
  const identity=await user.json() as {id?:string};if(!identity.id)return reply({code:'LOGIN_REQUIRED'},401);
  const gate=await call('/rest/v1/rpc/admin_operator',{method:'POST',body:'{}'});
  if(!gate.ok||await gate.json()!==true)return reply({code:'ADMIN_REQUIRED'},403);
  const response=await call('/rest/v1/rpc/'+(feedback?'admin_essay_feedback_result':'essay_exam_history'),{method:'POST',body:JSON.stringify(feedback?{p_feedback:feedback}:{p_run:run})});
  if(!response.ok){const error=await response.json().catch(()=>({})) as {code?:string};const diagnostic=/^[A-Z0-9]{5,12}$/.test(error.code??'')?error.code:'UNKNOWN';return reply({code:'READ_UNAVAILABLE_'+response.status+'_'+diagnostic},502);}
  const data=await response.json() as {version?:string;runs?:unknown[]};
  if(data.version!=='essay-exam-history-v1'||!Array.isArray(data.runs))return reply({code:'INVALID_RESPONSE'},502);
  return reply({source:'stored-owner-results',...data});
 }catch{return reply({code:'READ_UNAVAILABLE'},502);}
}
export const onRequest=({request,env}:{request:Request;env:Env})=>handleOwnerReview(request,env);
