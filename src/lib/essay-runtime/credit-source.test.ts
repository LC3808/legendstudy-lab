import {expect,it} from 'vitest';
import {parseCreditSource} from './credit-source';
const source={version:'essay-credit-source-v1',grant_id:'11111111-1111-4111-8111-111111111111',source:'purchase',beta:0,signup_bonus:0,purchase:3,other:0};
it('preserves selected grant and server balances for explicit consent',()=>{expect(parseCreditSource(source,1)).toEqual(source);});
it('free rewrite cannot consume a grant',()=>{expect(parseCreditSource({...source,source:'included',grant_id:null},0).grant_id).toBeNull();expect(()=>parseCreditSource(source,0)).toThrow();});
it.each([{source:'unknown'},{grant_id:null},{grant_id:'invalid'},{beta:-1},{purchase:1.5},{signup_bonus:'3'},{version:'unknown'}])('rejects malformed source: %j',patch=>{expect(()=>parseCreditSource({...source,...patch},1)).toThrow();});
