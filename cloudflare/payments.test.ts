import { describe, it, expect } from 'vitest';
import { payment, type Env } from './payments';
const ID='11111111-1111-4111-8111-111111111111', KEY='22222222-2222-4222-8222-222222222222';
const origin='https://legendstudy-lab-payment-test.pages.dev';
// Deliberately synthetic non-credential strings, generated to avoid token literals in artifacts.
const env:Env={PAYMENT_MODE:'TEST',PAYMENT_ORIGIN:origin,PAYMENT_SUPABASE_URL:'https://wsnrwklplnunjktyfmbr.supabase.co',PAYMENT_SUPABASE_PUBLISHABLE_KEY:'synthetic-public',PAYMENT_FINANCE_TOKEN:'synthetic-finance',PAYMENT_SUPPORT_SUBJECTS:'synthetic-user',TOSS_TEST_CLIENT_KEY:['test','ck','fixture'].join('_'),TOSS_TEST_SECRET_KEY:['test','sk','fixture'].join('_'),TOSS_MID:'synthetic'};
function fixture(){
 let order:Record<string,unknown>={dto_version:'payment-v1',id:ID,order_id:'ls_'+ID.replaceAll('-',''),mode:'TEST',sku:'10c',quantity:10,amount:29900,currency:'KRW',state:'ORDER_CREATED',grant_state:'NONE',expires_at:'2099-01-01',paid_at:null,credit_expires_at:null};
 let op:Record<string,unknown>={};let storedCreate='';let storedConfirm='';let finishes=0;let cancels=0;
 let provider:Record<string,unknown>={paymentKey:'synthetic-payment',orderId:order.order_id,mId:'synthetic',currency:'KRW',totalAmount:29900,balanceAmount:29900,status:'IN_PROGRESS',approvedAt:'2026-10-03T00:00:00Z',isPartialCancelable:true};
 const calls:{url:string;body:Record<string,unknown>;headers:Headers}[]=[];
 const f={foreign:false,providerFailure:false,malformed:false,finishFailure:false,cancelFailure:false,refund:29900};
 const io:typeof fetch=async(input,init)=>{
  const url=String(input);const body=init?.body?JSON.parse(String(init.body)):{};calls.push({url,body,headers:new Headers(init?.headers)});
  const ok=(x:unknown)=>Response.json(x);const err=()=>Response.json({message:'sensitive arbitrary detail'},{status:403});
  if(url.endsWith('/auth/v1/user'))return ok({id:'synthetic-user'});
  if(url.endsWith('/payment_order')){
   if(f.foreign || new Headers(init?.headers).get('Authorization')!=='Bearer synthetic-user-token')return err();
   if(body.p.action==='create'){
    const signature=JSON.stringify(body.p);if(storedCreate&&storedCreate!==signature)return err();storedCreate=signature;
    const prices:Record<string,number>={'1c':4900,'3c':11900,'5c':17900,'10c':29900};order={...order,sku:body.p.sku,amount:prices[body.p.sku],quantity:parseInt(body.p.sku)};
   }
   return ok(order);
  }
  if(url.endsWith('/payment_process')){
   if(new Headers(init?.headers).get('Authorization')!=='Bearer synthetic-finance')return err();
   const p=body.p;
   if(p.action==='confirm_begin'){
    const signature=JSON.stringify(p);if(storedConfirm&&storedConfirm!==signature)return err();storedConfirm=signature;
    if(!op.operation_id){op={operation_id:KEY,operation_state:'PENDING',provider_idempotency_key:KEY,payment_key:p.payment_key,operation_amount:order.amount};order.state='AUTHORIZATION_PENDING';}
   }
   if(p.action==='confirm_finish'){
    if(f.finishFailure){f.finishFailure=false;return new Response(null,{status:503});}
    if(op.operation_state!=='SUCCEEDED')finishes++;op.operation_state='SUCCEEDED';order.state='PAID';order.grant_state='TEST_RECORDED';
   }
   if(p.action==='cancel_begin'&&order.state==='PAID'){order.state='CANCEL_PENDING';op={...op,operation_state:'PENDING',operation_amount:f.refund,provider_idempotency_key:'cancel-'+KEY};}
   if(p.action==='cancel_finish'){if(op.operation_state!=='SUCCEEDED')cancels++;op.operation_state='SUCCEEDED';order.state=f.refund===29900?'CANCELLED':'PARTIALLY_CANCELLED';order.grant_state='REVOKED';}
   return ok({...order,...op});
  }
  if(url.startsWith('https://api.tosspayments.com/')){
   if(f.providerFailure)throw new Error('SECRET provider timeout');if(f.malformed)return ok({raw:'sensitive'});
   if(url.endsWith('/confirm'))provider={...provider,status:'DONE'};
   if(url.endsWith('/cancel')){if(f.cancelFailure)throw new Error('timeout');provider={...provider,status:f.refund===29900?'CANCELED':'PARTIAL_CANCELED',balanceAmount:29900-f.refund,cancels:[{cancelStatus:'DONE',cancelAmount:f.refund}]};}
   return ok(provider);
  }
  throw new Error('unexpected test URL');
 };
 const send=(action:string,p:object,e:Env=env,more:RequestInit={})=>payment(new Request(origin+'/api/payments/'+action,{method:'POST',headers:{Origin:origin,Authorization:'Bearer synthetic-user-token','Content-Type':'application/json'},body:JSON.stringify(p),...more}),e,io);
 const confirm=()=>send('confirm',{id:ID,request_key:KEY,payment_key:'synthetic-payment',amount:29900});
 return {send,confirm,calls,f,order,provider,get finishes(){return finishes;},get cancels(){return cancels;}};
}
describe('PAYMENT-2 deterministic APP contract and provider adapter',()=>{
 for(const [sku,amount]of Object.entries({'1c':4900,'3c':11900,'5c':17900,'10c':29900}))it(`canonical SKU ${sku}`,async()=>{const f=fixture();const r=await f.send('orders',{sku,request_key:KEY});const b=await r.json();expect(b.order.amount).toBe(amount);expect(b.checkout.amount.value).toBe(amount);expect(b.checkout.orderId).toBe('ls_'+ID.replaceAll('-',''));});
 for(const extra of [{amount:1},{user_id:ID},{mode:'LIVE'},{coupon:'discount'},{successUrl:'https://evil.test'}])it(`reject forged field ${Object.keys(extra)[0]}`,async()=>{const f=fixture();expect((await f.send('orders',{sku:'1c',request_key:KEY,...extra})).status).toBe(422);expect(f.calls).toHaveLength(0);});
 it('unsupported SKU',async()=>expect((await fixture().send('orders',{sku:'20c',request_key:KEY})).status).toBe(422));
 it('duplicate order returns same canonical id',async()=>{const f=fixture();const p={sku:'10c',request_key:KEY};expect(await(await f.send('orders',p)).json()).toEqual(await(await f.send('orders',p)).json());});
 it('changed duplicate conflicts',async()=>{const f=fixture();await f.send('orders',{sku:'10c',request_key:KEY});expect((await f.send('orders',{sku:'1c',request_key:KEY})).ok).toBe(false);});
 it('owner is rechecked before finance',async()=>{const f=fixture();f.f.foreign=true;expect((await f.confirm()).status).toBe(403);expect(f.calls.some(c=>c.url.includes('payment_process'))).toBe(false);});
 it('exact confirmation and TEST record',async()=>{const f=fixture();const r=await f.confirm();expect(r.status).toBe(200);const b=await r.json();expect(b.order.grant_state).toBe('TEST_RECORDED');expect(b.order.payment_key).toBeUndefined();expect(f.finishes).toBe(1);expect(f.calls.every(c=>!c.url.includes('credit_'))).toBe(true);});
 it('amount mismatch calls no finance/provider',async()=>{const f=fixture();expect((await f.send('confirm',{id:ID,request_key:KEY,payment_key:'synthetic-payment',amount:1})).status).toBe(422);expect(f.calls).toHaveLength(1);});
 it('duplicate confirmation posts once',async()=>{const f=fixture();await f.confirm();await f.confirm();expect(f.finishes).toBe(1);});
 it('concurrent confirmations reuse durable operation key',async()=>{const f=fixture();await Promise.all([f.confirm(),f.confirm()]);expect(f.finishes).toBe(1);const keys=f.calls.filter(c=>c.url.endsWith('/confirm')).map(c=>c.headers.get('Idempotency-Key'));expect(new Set(keys).size).toBe(1);});
 it('changed confirmation identity rejected',async()=>{const f=fixture();await f.confirm();expect((await f.send('confirm',{id:ID,request_key:KEY,payment_key:'changed',amount:29900})).ok).toBe(false);});
 it('timeout grants nothing and records UNKNOWN',async()=>{const f=fixture();f.f.providerFailure=true;expect((await f.confirm()).status).toBe(503);expect(f.finishes).toBe(0);expect(f.calls.some(c=>(c.body.p as Record<string,unknown>)?.outcome==='UNKNOWN')).toBe(true);});
 it('malformed provider response grants nothing',async()=>{const f=fixture();f.f.malformed=true;expect((await f.confirm()).status).toBe(503);expect(f.finishes).toBe(0);});
 for(const field of ['paymentKey','orderId','mId','currency','totalAmount'])it(`provider mismatch ${field}`,async()=>{const f=fixture();f.provider[field]='wrong';expect((await f.confirm()).status).toBe(503);expect(f.finishes).toBe(0);});
 for(const [mid,allowed] of [['tleglabn24k',true],['leglabn24k',false],['tleglabxvb9',false],['ttleglabn24k',false]] as const)it(`verified merchant TEST MID ${mid}`,async()=>{const f=fixture();f.provider.mId=mid;const r=await f.send('confirm',{id:ID,request_key:KEY,payment_key:'synthetic-payment',amount:29900},{...env,TOSS_MID:'leglabn24k'});expect(r.status).toBe(allowed?200:503);expect(f.finishes).toBe(allowed?1:0);});
 it('MID mismatch exposes bounded identity without sending confirm',async()=>{const f=fixture();f.provider.mId='other-test';const b=await(await f.confirm()).json();expect(b.diagnostic.provider_mid).toBe('other-test');expect(b.diagnostic.expected_mid).toBe('synthetic');expect(b.diagnostic.confirm_sent).toBe(false);expect(f.calls.some(c=>c.url.endsWith('/confirm'))).toBe(false);});
 it('provider success local failure recovered by lookup',async()=>{const f=fixture();f.f.finishFailure=true;expect((await f.confirm()).status).toBe(503);expect((await f.send('reconcile',{id:ID})).status).toBe(200);expect(f.finishes).toBe(1);expect(f.calls.filter(c=>c.url.endsWith('/confirm'))).toHaveLength(1);});
 it('status does not mutate payment',async()=>{const f=fixture();expect((await f.send('status',{id:ID})).ok).toBe(true);expect(f.finishes).toBe(0);expect(f.calls).toHaveLength(1);});
 it('full cancellation',async()=>{const f=fixture();await f.confirm();const r=await f.send('cancel',{id:ID,request_key:KEY});expect((await r.json()).order.state).toBe('CANCELLED');expect(f.cancels).toBe(1);});
 it('partial 5400 comes from APP authority',async()=>{const f=fixture();await f.confirm();f.f.refund=5400;const r=await f.send('cancel',{id:ID,request_key:KEY});expect((await r.json()).order.state).toBe('PARTIALLY_CANCELLED');expect(f.calls.find(c=>c.url.endsWith('/cancel'))?.body.cancelAmount).toBe(5400);});
 it('duplicate cancellation',async()=>{const f=fixture();await f.confirm();await f.send('cancel',{id:ID,request_key:KEY});await f.send('cancel',{id:ID,request_key:KEY});expect(f.cancels).toBe(1);});
 it('concurrent cancellation',async()=>{const f=fixture();await f.confirm();await Promise.all([f.send('cancel',{id:ID,request_key:KEY}),f.send('cancel',{id:ID,request_key:KEY})]);expect(f.cancels).toBe(1);});
 it('cancel failure keeps pending then recovery',async()=>{const f=fixture();await f.confirm();f.f.cancelFailure=true;expect((await f.send('cancel',{id:ID,request_key:KEY})).status).toBe(503);expect(f.cancels).toBe(0);f.f.cancelFailure=false;expect((await f.send('reconcile',{id:ID})).status).toBe(200);expect(f.cancels).toBe(1);});
 it('unauthorized support denied',async()=>{const f=fixture();expect((await f.send('cancel',{id:ID,request_key:KEY},{...env,PAYMENT_SUPPORT_SUBJECTS:''})).status).toBe(403);});
 for(const mode of ['LIVE','',undefined])it(`mode ${mode} closed`,async()=>{const f=fixture();expect((await f.send('status',{id:ID},{...env,PAYMENT_MODE:mode})).status).toBe(503);expect(f.calls).toHaveLength(0);});
 it('missing secret closed',async()=>expect((await fixture().send('status',{id:ID},{...env,TOSS_TEST_SECRET_KEY:undefined})).status).toBe(503));
 it('foreign origin denied',async()=>expect((await fixture().send('status',{id:ID},env,{headers:{Origin:'https://evil.test'}})).status).toBe(403));
 it('anon denied',async()=>expect((await fixture().send('status',{id:ID},env,{headers:{Origin:origin,'Content-Type':'application/json'}})).status).toBe(401));
 it('content type denied',async()=>expect((await fixture().send('status',{id:ID},env,{headers:{Origin:origin,'Content-Type':'text/plain'}})).status).toBe(415));
 it('method denied',async()=>expect((await fixture().send('status',{},env,{method:'GET',body:undefined})).status).toBe(405));
 it('oversize denied',async()=>expect((await fixture().send('status',{id:'a'.repeat(3000)})).status).toBe(413));
 it('malformed JSON denied',async()=>expect((await fixture().send('status',{},env,{body:'{'})).status).toBe(422));
 it('unknown endpoint denied',async()=>expect((await fixture().send('other',{})).status).toBe(404));
 it('errors sanitized and no logs',async()=>{const f=fixture();f.f.providerFailure=true;const r=await f.confirm();const b=await r.json();expect(b.error).toBe('RECONCILIATION_REQUIRED');expect(b.diagnostic.stage).toBe('provider_lookup');expect(JSON.stringify(b)).not.toContain('SECRET');});
});

describe('Production readiness fail-closed boundaries (synthetic IO only)',()=>{
 for(const url of ['https://stlhijzpjfgwwdgunlsd.supabase.co','https://wrong.supabase.co','https://evil.example',''])it(`reject project ${url} before credentials leave`,async()=>{const f=fixture();expect((await f.send('orders',{sku:'1c',request_key:KEY},{...env,PAYMENT_SUPABASE_URL:url})).status).toBe(503);expect(f.calls).toHaveLength(0);});
 for(const url of ['https://lab.legendstudy.com','https://other.pages.dev'])it(`reject deployment ${url}`,async()=>{const f=fixture();expect((await f.send('orders',{sku:'1c',request_key:KEY},{...env,PAYMENT_ORIGIN:url})).status).toBe(503);expect(f.calls).toHaveLength(0);});
 for(const field of ['TOSS_TEST_CLIENT_KEY','TOSS_TEST_SECRET_KEY'] as const)it(`LIVE key in TEST ${field} denied`,async()=>{const f=fixture();expect((await f.send('status',{id:ID},{...env,[field]:['live',field.includes('CLIENT')?'ck':'sk','synthetic'].join('_')})).status).toBe(503);expect(f.calls).toHaveLength(0);});
});
