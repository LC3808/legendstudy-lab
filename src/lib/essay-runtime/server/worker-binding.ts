import type {ReviewedWorkerBinding} from './gateway';
export type WorkerEnvironment={ESSAY_REVIEWED_WORKER?:ReviewedWorkerBinding;ESSAY_WORKER_ORIGIN?:string;ESSAY_WORKER_SERVICE_TOKEN?:string};
/** Reuse a service binding when provisioned. A private Python host is an explicit
 * alternative for the existing ReviewedRuntimeWorker; no new evaluator is created. */
export function reviewedWorkerBinding(env:WorkerEnvironment):ReviewedWorkerBinding|undefined{
 if(env.ESSAY_REVIEWED_WORKER)return env.ESSAY_REVIEWED_WORKER;
 if(!env.ESSAY_WORKER_ORIGIN||!env.ESSAY_WORKER_SERVICE_TOKEN||env.ESSAY_WORKER_SERVICE_TOKEN.length<32)return undefined;
 const origin=new URL(env.ESSAY_WORKER_ORIGIN);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.origin!==env.ESSAY_WORKER_ORIGIN)throw Error('INVALID_WORKER_ORIGIN');
 return {async fetch(request){
  const url=new URL(request.url);
  if(url.origin!=='https://essay-worker.internal'||!['/admission','/evaluate'].includes(url.pathname)||url.search||request.method!=='POST')throw Error('INVALID_WORKER_REQUEST');
  const response=await fetch(origin.origin+url.pathname,{method:'POST',redirect:'manual',signal:request.signal,headers:{'Content-Type':'application/json','X-Essay-Service-Token':env.ESSAY_WORKER_SERVICE_TOKEN!,...(request.headers.get('authorization')?{Authorization:request.headers.get('authorization')!}:{})},body:await request.text()});
  if(response.status>=300&&response.status<400)throw Error('WORKER_REDIRECT_DENIED');
  return response;
 }};
}
