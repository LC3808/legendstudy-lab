import {it,expect,vi} from 'vitest';
import {assertRecognizedInputConfirmed,hasUnresolvedRecognition,validSourceBox} from './recognition-safety';
import {fromWireCandidateRegion} from './runtime/mapping';
import fixture from './hanyang2024-replay.json';
const context=(regions:unknown[],typed_answer='')=>({attempt:{input_kind:'EVIDENCE',typed_answer},extraction:regions});
it('replays Q1 high-confidence exponent/sign corruption as mandatory source review',()=>{
 const row=fixture.q1[12];expect(row.confidence).toBe(.9);expect(row.uncertain).toBe(false);
 expect(fromWireCandidateRegion({...row,region_id:'q1-13'}).confidence).toBe('AMBIGUOUS');
 expect(validSourceBox(fixture.q1[16])).toBe(false);
});
it('does not call the provider for unconfirmed or explicitly unresolved input',()=>{
 const provider=vi.fn();
 for(const [rows,id] of [[fixture.q1,null],[[{raw_text:'[UNCERTAIN: exponent]',uncertain:false}], 'confirmed']] as const){
  expect(()=>{assertRecognizedInputConfirmed(context([...rows]),id);provider();}).toThrow();
 }
 expect(provider).not.toHaveBeenCalled();
});
it('retains Q2 recognition text and permits one authoritative student confirmation',()=>{
 expect(fixture.q2.every(row=>!row.uncertain&&validSourceBox(row))).toBe(true);
 const saved=structuredClone(fixture.q2);
 for(const row of saved){const v=fromWireCandidateRegion({...row,region_id:String(row.reading_order)});expect(v.rawText).toBe(row.raw_text);expect(v.pageIndex).toBe(0);}
 expect(()=>assertRecognizedInputConfirmed(context(saved),'confirmed')).not.toThrow();
 expect(fixture.q2).toEqual(saved);
});
it('keeps original candidate separate from student correction; unresolved symbols never pass',()=>{
 const original={raw_text:'e^x [UNCERTAIN]',normalized_math:'',uncertain:true};
 const corrected={...original,raw_text:'e^{-x}',uncertain:false};
 expect(()=>assertRecognizedInputConfirmed(context([corrected]),'confirmed')).not.toThrow();
 expect(original.raw_text).toContain('UNCERTAIN');
 expect(hasUnresolvedRecognition('[? exponent]')).toBe(true);
});

it.each(['[분수식]', '[ 분수식 ]', '[이하 일부 판독 불명]', '[판독 불확실: x 또는 -x]', '[인식 불가]', 'UNCERTAIN'])('blocks observed unresolved OCR marker %s before provider',text=>{
 expect(hasUnresolvedRecognition(text)).toBe(true);
 expect(()=>assertRecognizedInputConfirmed(context([{raw_text:text,uncertain:false}]),'confirmed')).toThrow('MATH_RECOGNITION_UNRESOLVED');
});

it('blocks the observed fraction placeholder in typed mixed input before provider dispatch',()=>{
 const provider=vi.fn();
 expect(()=>{assertRecognizedInputConfirmed({attempt:{input_kind:'TYPED',typed_answer:'따라서 [분수식] = -4'},extraction:[]},null);provider();}).toThrow('MATH_RECOGNITION_UNRESOLVED');
 expect(provider).not.toHaveBeenCalled();
 expect(hasUnresolvedRecognition('분수식의 분모는 0이 아니다.')).toBe(false);
});

it.each(['2n+?개의 점', 'x = ？', String.raw`\frac{?}{2}`])('blocks an unresolved mathematical placeholder even after confirmation: %s', text=>{
 expect(()=>assertRecognizedInputConfirmed(context([{raw_text:text,normalized_math:'',uncertain:false}]),'confirmed')).toThrow('MATH_RECOGNITION_UNRESOLVED');
 expect(hasUnresolvedRecognition('왜 이 식을 사용했나요?')).toBe(false);
});
