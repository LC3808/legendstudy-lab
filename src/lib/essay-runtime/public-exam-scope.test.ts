import {describe,it,expect} from 'vitest';
import {publicExamScope} from './public-exam-scope';
describe('exact UUID scope encoding',()=>{
 const ids=Array.from({length:181},(_,i)=>`00000000-0000-4000-8000-${i.toString(16).padStart(12,'0')}`);
 const encode=(values:string[])=>'uuid64:'+btoa(values.map(id=>id.replaceAll('-','').match(/../g)!.map(byte=>String.fromCharCode(parseInt(byte,16))).join('')).join(''));
 it('preserves the same exact approved ID set in both representations',()=>{expect(publicExamScope(encode(ids))).toEqual(ids);expect(publicExamScope(ids.join(','))).toEqual(ids);});
 it.each(['uuid64:','uuid64:*','uuid64:AAAA','uuid64:!!!!'])('fails closed for malformed input %s',raw=>expect(publicExamScope(raw)).toEqual([]));
 it('rejects duplicates and excess scope',()=>{expect(publicExamScope(encode([ids[0],ids[0]]))).toEqual([]);expect(publicExamScope(encode(Array(257).fill(ids[0])))).toEqual([]);});
});
