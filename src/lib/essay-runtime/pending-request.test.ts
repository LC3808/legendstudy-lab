import {expect,it} from 'vitest';
import {pendingStorageKey,restorePending,savePending} from './pending-request';
const old={fingerprint:'old',key:'keep-exactly',answers:[{questionId:'q1',body:'original',revision:1}]};
function store(){const data=new Map([['owner:exam:initial',JSON.stringify(old)]]);return {data,read:(k:string)=>data.get(k)??'',write:(k:string,v:string)=>{data.set(k,v);}};}
it('separates Q2 without deleting or replaying the existing Q1 request',()=>{const s=store();expect(restorePending(s,'owner:exam:initial',['q2'])).toBeNull();expect(s.data.size).toBe(1);expect(JSON.parse(s.read('owner:exam:initial'))).toEqual(old);});
it('migrates a same-question ambiguous request with its exact key and body',()=>{const s=store();expect(restorePending(s,'owner:exam:initial',['q1'])).toEqual(old);expect(s.read(pendingStorageKey('owner:exam:initial',['q1']))).toBe(JSON.stringify(old));expect(s.read('owner:exam:initial')).toBe(JSON.stringify(old));});
it('canonical sets ignore order; overlapping legacy requests remain blocked',()=>{expect(pendingStorageKey('x',['q2','q1'])).toBe(pendingStorageKey('x',['q1','q2']));expect(()=>restorePending(store(),'owner:exam:initial',['q1','q2'])).toThrow('PENDING_CHANGED');});
it('explicit failed retry tombstone does not resurrect a migrated legacy request',()=>{const s=store();s.write(pendingStorageKey('owner:exam:initial',['q1']),'null');expect(restorePending(s,'owner:exam:initial',['q1'])).toBeNull();expect(s.read('owner:exam:initial')).toBe(JSON.stringify(old));});
it('owner and cycle boundaries never inherit foreign requests',()=>{expect(restorePending(store(),'other:exam:initial',['q1'])).toBeNull();expect(restorePending(store(),'owner:exam:parent',['q1'])).toBeNull();});

it('new scoped pending requests also block overlapping changes and preserve disjoint requests',()=>{const s=store();savePending(s,'owner:exam:initial',{...old,key:'q2-key',answers:[{questionId:'q2',body:'two',revision:1}]});expect(()=>restorePending(s,'owner:exam:initial',['q2','q3'])).toThrow('PENDING_CHANGED');expect(restorePending(s,'owner:exam:initial',['q3'])).toBeNull();});
