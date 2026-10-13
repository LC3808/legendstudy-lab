import {describe,it,expect} from 'vitest';
import {validateExtraction,importAnalysis} from './analysis';
import type {Detail} from './contract';
const hash='a'.repeat(64),sources=[{sourceHash:hash,pages:['exam1 question','exam2 criteria']}];
const detail={examId:'e',questions:[{id:'q'}]} as Detail;
const mapping={questionId:'q',sourceHash:hash,role:'question',startPage:1,endPage:1,evidenceText:'exam1 question'};
describe('AI extraction source boundary',()=>{
 it('keeps exact quotes unverified and inferred notes separate',()=>{const r=validateExtraction({mappings:[mapping],notes:['inference']},detail,sources);expect(r.mappings[0].verification).toBe('NEEDS_REVIEW');expect(r.mappings[0].origin).toBe('pdf_quote');expect(r.notes).toEqual(['inference']);});
 it('rejects fabricated text, foreign questions/hashes and wrong pages',()=>{for(const change of [{evidenceText:'invented'},{questionId:'other'},{sourceHash:'b'.repeat(64)},{startPage:2,endPage:2},{endPage:3},{role:'unknown'}])expect(()=>validateExtraction({mappings:[{...mapping,...change}],notes:[]},detail,sources)).toThrow();});
 it('imports only this exact exam and full source hash set',()=>{const raw={examId:'e',sources:[hash],mappings:[mapping],notes:[]};expect(importAnalysis(raw,detail,sources).mappings).toHaveLength(1);expect(()=>importAnalysis({...raw,examId:'other'},detail,sources)).toThrow();expect(()=>importAnalysis({...raw,sources:[]},detail,sources)).toThrow();});
});
