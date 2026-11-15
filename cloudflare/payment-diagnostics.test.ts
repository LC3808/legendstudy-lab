import { expect, it } from 'vitest';
import { paymentDiagnostics } from './payment-diagnostics';
it('fixed read-only probes redact arbitrary provider content',async()=>{
 const requests:{url:string;init?:RequestInit}[]=[];
 const io:typeof fetch=async(url,init)=>{requests.push({url:String(url),init});return Response.json({code:String(url).includes('supabase')?'PT404':'API_KEY_ACCESS_DENIED',message:'PRIVATE_SECRET',paymentKey:'PRIVATE_KEY'},{status:String(url).includes('supabase')?404:403});};
 const result=await paymentDiagnostics({PAYMENT_SUPABASE_URL:'https://fixture.supabase.co',PAYMENT_FINANCE_TOKEN:'private-finance',TOSS_LIVE_SECRET_KEY:'private-provider'},io);
 expect(result.finance_read_authorized).toBe(true);expect(JSON.stringify(result)).not.toMatch(/PRIVATE|private-/);
 expect(requests[1].init?.method).toBe('GET');expect(JSON.parse(String(requests[0].init?.body)).p.action).toBe('get');expect(requests).toHaveLength(2);
});
it('does not treat unverified missing payment or transient error as matching MID',async()=>{
 const result=await paymentDiagnostics({},async()=>{throw Error('PRIVATE_SECRET');});
 expect(result.finance_read_authorized).toBe(false);expect(result.client_secret_pair_verified).toBe(false);expect(JSON.stringify(result)).not.toContain('PRIVATE');
});
