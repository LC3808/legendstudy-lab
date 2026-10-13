import {it, expect, vi, afterEach} from 'vitest';
import {registryWorkerCredential} from './registry-credential';
import {onRequestPost} from '../../../../functions/api/essay/catalog';
import {legendStudySupabaseUrl} from '../../auth-config';
const now=1800000000000;
// No real signature or credential in these configuration-only fixtures.
const token=(claims:unknown,alg='ES256')=>[btoa(JSON.stringify({alg})).replace(/=/g,''),btoa(JSON.stringify(claims)).replace(/=/g,''),'fixture'].join('.');
afterEach(()=>vi.unstubAllGlobals());
it('rejects user/API keys, expired/near-expiry credentials and unsigned tokens',()=>{
 for(const value of [undefined,'sb_secret_fixture','sb_publishable_fixture','Bearer abc',
  ...['anon','authenticated','admin'].map(role=>token({role,exp:now/1000+3600})),
  ...[undefined,now/1000-1,now/1000+60,'1900000000'].map(exp=>token({role:'essay_worker',exp})),
  token({role:'essay_worker',exp:now/1000+3600},'none'),
  token({role:'essay_worker',exp:now/1000+3600,nbf:now/1000+1})])expect(registryWorkerCredential(value,now)).toBeNull();
});
it('accepts structurally valid credentials only as preflight, not signature verification',()=>{
 const value=token({role:'essay_worker',exp:now/1000+3600});
 expect(registryWorkerCredential(value,now)).toBe(value);
});
it('fails closed before networking and does not reflect a wrongly configured secret',async()=>{
 const request=vi.fn();vi.stubGlobal('fetch',request);
 const secret=token({role:'authenticated',exp:Math.floor(Date.now()/1000)+3600});
 const response=await onRequestPost({request:new Request('https://lab.legendstudy.com/api/essay/catalog',{method:'POST',headers:{Authorization:'Bearer student'}}),env:{MATH_SUPABASE_URL:legendStudySupabaseUrl,ESSAY_REGISTRY_WORKER_JWT:secret}});
 expect(response.status).toBe(503);expect(await response.text()).not.toContain(secret);
 expect(request).not.toHaveBeenCalled();
});
