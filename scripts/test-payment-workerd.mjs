/** Real workerd, synthetic outbound service only. No external provider/DB calls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const {Miniflare, convertV4MiniflareOptions} = require(process.argv[2] || 'miniflare');
const source = readFileSync(new URL('../cloudflare/payments.ts', import.meta.url),'utf8');
assert.match(source, /redirect: 'manual'/);
const script = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,'') + '\nexport default {async fetch(){try {const r=await call(fetch,"https://synthetic.invalid/",{headers:{Authorization:"Bearer synthetic-only"}});return new Response(null,{status:r.status});}catch{return new Response(null,{status:503});}}};';
for(const status of [200,400,301,302,303,304,307,308]) {
 let calls=0;
 const options={modules:true,compatibilityDate:'2026-09-22',script,outboundService:async request=>{calls++;assert.equal(request.url,'https://synthetic.invalid/');return new Response(null,{status,headers:{Location:'https://must-not-follow.invalid/'}});}};
 const mf=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
 try{const r=await mf.dispatchFetch('https://worker.invalid/');assert.equal(r.status,status>=300&&status<400?503:status);assert.equal(calls,1);console.log(`WORKERD_PAYMENT PASS status=${status} outbound=1 redirects_followed=0`);}finally{await mf.dispose();}
}
// Execute actual payment handler in both modes; every outbound request is intercepted.
for (const mode of ['TEST','LIVE']) {
 const live=mode==='LIVE'; const origin=live?'https://lab.legendstudy.com':'https://legendstudy-lab-payment-test.pages.dev';
 const bindings={PAYMENT_MODE:mode,PAYMENT_ENABLED:'true',PAYMENT_ORIGIN:origin,PAYMENT_SUPABASE_URL:live?'https://stlhijzpjfgwwdgunlsd.supabase.co':'https://wsnrwklplnunjktyfmbr.supabase.co',PAYMENT_SUPABASE_PUBLISHABLE_KEY:'synthetic-public',PAYMENT_FINANCE_TOKEN:'synthetic-finance',TOSS_MID:'leglabn24k', [live?'TOSS_LIVE_CLIENT_KEY':'TOSS_TEST_CLIENT_KEY']:[live?'live':'test','ck','fixture'].join('_'),[live?'TOSS_LIVE_SECRET_KEY':'TOSS_TEST_SECRET_KEY']:[live?'live':'test','sk','fixture'].join('_')};
 const id='11111111-1111-4111-8111-111111111111';
 let order={dto_version:'payment-v1',id,order_id:'ls_'+id.replaceAll('-',''),mode,amount:4900,quantity:1,sku:'1c',currency:'KRW',grant_state:'NONE',state:'ORDER_CREATED',expires_at:'2099-01-01'};
 let calls=0;
 const worker=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,'')+'\nexport default {fetch(request,env){return payment(request,env);}};';
 const options={modules:true,compatibilityDate:'2026-09-22',script:worker,bindings,outboundService:async request=>{
  calls++;const url=request.url;
  if(url.includes('/rest/v1/rpc/payment_order'))return Response.json(order);
  if(url.includes('/rest/v1/rpc/payment_process')){
   const {p}=await request.json();if(p.action==='confirm_begin')order={...order,state:'AUTHORIZATION_PENDING',operation_id:id,operation_state:'PENDING',payment_key:'synthetic',provider_idempotency_key:id};
   if(p.action==='confirm_finish')order={...order,state:'PAID',operation_state:'SUCCEEDED',grant_state:live?'POSTED':'TEST_RECORDED'};
   return Response.json(order);
  }
  if(url==='https://api.tosspayments.com/v1/payments/synthetic')return Response.json({paymentKey:'synthetic',orderId:order.order_id,totalAmount:4900,balanceAmount:4900,currency:'KRW',mId:live?'leglabn24k':'tleglabn24k',status:'DONE',approvedAt:'2026-10-04T00:00:00Z'});
  throw new Error('Unexpected synthetic transport destination');
 }};
 const mf=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
 try {
  const send=(action,body)=>mf.dispatchFetch(origin+'/api/payments/'+action,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer synthetic-buyer-token'},body:JSON.stringify(body)});
  assert.equal((await(await send('runtime',{})).json()).state,mode);assert.equal(calls,0);
  assert.equal((await(await send('orders',{sku:'1c',request_key:id})).json()).checkout.amount.value,4900);
  const result=await send('confirm',{id,request_key:id,payment_key:'synthetic',amount:4900});assert.equal(result.status,200);assert.equal((await result.json()).order.grant_state,live?'POSTED':'TEST_RECORDED');
  console.log(`WORKERD_PAYMENT_RUNTIME ${mode} runtime/order/recovery PASS synthetic_only=true`);
 }finally{await mf.dispose();}
}
