import {it,expect,vi} from 'vitest';
import {generateKeyPair,exportJWK,decodeJwt,decodeProtectedHeader} from 'jose';
import {issue,probe,ISSUER} from './credential';
it('issues ES256 fixed least-privilege claims and verifies matching JWKS',async()=>{
 const pair=await generateKeyPair('ES256',{extractable:true});const priv={...await exportJWK(pair.privateKey),kid:'fixture',key_ops:['sign','verify']};const pub={...await exportJWK(pair.publicKey),kid:'fixture'};
 const c=await issue({FINANCE_SIGNING_JWK:JSON.stringify(priv),FINANCE_SUBJECT:'11111111-1111-4111-8111-111111111111',FINANCE_PUBLISHABLE_KEY:'public'},vi.fn(async()=>Response.json({keys:[pub]})) as typeof fetch,1000000);
 expect(decodeProtectedHeader(c.token).alg).toBe('ES256');expect(decodeJwt(c.token)).toEqual({role:'essay_finance',sub:'11111111-1111-4111-8111-111111111111',aud:'authenticated',iss:ISSUER,iat:1000000,exp:1604800});
 expect(c.fingerprint).toMatch(/^[a-f0-9]{64}$/);
});
it('rejects untrusted signer without leaking key',async()=>{await expect(issue({FINANCE_SIGNING_JWK:'PRIVATE',FINANCE_SUBJECT:'bad',FINANCE_PUBLISHABLE_KEY:'public'})).rejects.toThrow('SIGNER_INVALID');});
it('read probe uses only missing-order get',async()=>{const io=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>{void _url;void _init;return Response.json({code:'PT404'},{status:404});});await probe('private','public',io as typeof fetch);expect(JSON.parse(io.mock.calls[0][1]!.body as string).p).toEqual({dto_version:'payment-v1',action:'get',id:'00000000-0000-0000-0000-000000000000'});});
it.each([[401,'PGRST303','PROBE_PGRST303'],[401,'PGRST301','PROBE_401'],[403,'42501','PROBE_403'],[200,'OK','PROBE_REJECTED']])('rejects probe %s/%s',async(status,code,error)=>{await expect(probe('private','public',vi.fn(async()=>Response.json({code},{status:Number(status)})) as typeof fetch)).rejects.toThrow(String(error));});
