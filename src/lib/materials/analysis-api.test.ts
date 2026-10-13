import {it,expect,vi,beforeEach} from 'vitest';
import {onRequestPost} from '../../../functions/api/materials/analyze';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),provider:vi.fn()}));
vi.mock('@/lib/math-release/server/transport',()=>({serverTransport:()=>({rpcRaw:mocks.rpc})}));
vi.mock('@/lib/math-release/server/provider',()=>({candidateJson:mocks.provider}));
const hash='a'.repeat(64),env={MATH_ORIGIN:'https://lab.legendstudy.com',MATH_PROVIDER_CALLS_ENABLED:'true',MATH_PROVIDER:'OPENAI',MATH_PRIMARY_MODEL:'fixture-model',MATH_PROVIDER_API_KEY:'synthetic-test-value'};
let approved=false;
beforeEach(()=>{approved=false;mocks.rpc.mockReset();mocks.provider.mockReset();mocks.rpc.mockImplementation(async(name:string)=>name==='is_quality_operator'?true:name==='essay_material_detail'?{examId:'e',questions:[{id:'q'}],review:{revision:2,body:{documents:[hash],rights:{[hash]:{providerTransmission:approved?'APPROVED':'UNVERIFIED'}}}}}:name==='essay_material_documents'?[{sha256:hash,page_count:1}]:[{examId:'e'}]);});
function request(origin=env.MATH_ORIGIN){return new Request(origin+'/api/materials/analyze',{method:'POST',headers:{Origin:origin,Authorization:'Bearer synthetic'},body:JSON.stringify({examId:'e',revision:2,sources:[{sourceHash:hash,pages:['quoted source']} ]})});}
it('denies nonoperator and cross-origin requests before provider',async()=>{expect((await onRequestPost({request:request('https://other.invalid'),env})).status).toBe(403);mocks.rpc.mockResolvedValue(false);expect((await onRequestPost({request:request(),env})).status).toBe(403);expect(mocks.provider).not.toHaveBeenCalled();});
it('requires saved source transmission rights and never charges Credit',async()=>{const r=await onRequestPost({request:request(),env});expect(r.status).toBe(409);expect(await r.json()).toEqual({code:'PROVIDER_RIGHTS_REQUIRED'});expect(mocks.provider).not.toHaveBeenCalled();expect(mocks.rpc.mock.calls.every(([name])=>!name.includes('credit')&&!name.includes('reserve'))).toBe(true);});
it('returns only validated unverified quotations',async()=>{approved=true;mocks.provider.mockResolvedValue({mappings:[{questionId:'q',sourceHash:hash,role:'question',startPage:1,endPage:1,evidenceText:'quoted source'}],notes:[]});const r=await onRequestPost({request:request(),env});expect(r.status).toBe(200);expect((await r.json()).mappings[0].verification).toBe('NEEDS_REVIEW');});
