import {describe,it,expect} from 'vitest';
import {mathReport,humanReport,compareReports,rating} from './evaluation-report';
const wire=(id='first',prior: string|null=null,grade='STRONG')=>({evaluation_id:id,prior_evaluation_id:prior,leaf_id:'leaf',profile_id:'profile',kind:prior?'REWRITE':'INITIAL',profile:{rubric_version:'v1'},output:{contract_version:'v1',provenance:{provider:'p',model_version:'m',prompt_version:'v1'},overall:{explanation:'ANSWER_CORRECT_AND_REASONING_SUFFICIENT'},rubric:{logical_development:grade},steps:[{position:1,status:'VALID',representation:'x=2',explanation:'근을 확인했어요.'}],core:[],errors:[]}});
describe('immutable, evidence-based display contract',()=>{
 it.each([null,undefined,0,6,2.5,'3',NaN])('does not invent stars for %s',v=>expect(rating(v)).toBeNull());
 it.each([1,2,3,4,5])('preserves existing educational level %s',v=>expect(rating(v)).toBe(v));
 it('preserves raw data, maps known diagnostic, keeps Math qualitative and attaches answer evidence',()=>{
  const input=wire(),snapshot=JSON.stringify(input),r=mathReport(input);expect(r.rubric[0].stars).toBeNull();expect(r.strengths[0].evidence).toBe('x=2');expect(r.summary).toContain('정확하게');expect(r.actions).toEqual([]);expect(JSON.stringify(input)).toBe(snapshot);
 });
 it.each([['STRONG','ADEQUATE','DECLINED'],['ADEQUATE','STRONG','IMPROVED'],['STRONG','STRONG','UNCHANGED'],['NOT_ASSESSABLE','STRONG','UNAVAILABLE']])('compares %s → %s without invented numeric growth', (a,b,result)=>expect(compareReports(mathReport(wire('first',null,a)),mathReport(wire('second','first',b)))?.[0].direction).toBe(result));
 it('ignores generic progression claims when actual grades did not change',()=>{const revised={...wire('second','first'),output:{...wire().output,progression:{delta:[{kind:'ANSWER_NOW_CORRECT'}]}}};expect(compareReports(mathReport(wire()),mathReport(revised))?.[0].direction).toBe('UNCHANGED');});
 it('rejects unrelated results, missing pins, changed rubric/model, partial retry and changed dimensions',()=>{
  for(const update of [{prior_evaluation_id:'other'},{leaf_id:'other'},{profile_id:'other'},{profile:{}},{kind:'STEP_RETRY'},{output:{...wire().output,provenance:{}}},{output:{...wire().output,rubric:{}}}])expect(compareReports(mathReport(wire()),mathReport({...wire('second','first'),...update}))).toBeNull();
 });
 it('uses original human text and existing issue actions without generating legacy data',()=>{
  const r=humanReport({overall_summary:'원문',strengths:['근거가 명확해요.'],rewrite_checklist:['연결 문장을 확인하세요.'],essay_evaluation_dimensions:[{criterion_id:'c',display_order:1,level_1_to_5:3,explanation:'원문',essay_evaluation_criteria:{label:'논제 이해'}}],essay_improvement_progress:[{title:'연결',explanation:'주장과 근거가 떨어져 있어요.',next_action:'연결 문장을 추가하세요.',status:'open'}]});
  expect(r.rubric[0].stars).toBe(3);expect(r.rubric[0].name).toBe('논제 이해');expect(r.actions).toEqual(['연결 문장을 추가하세요.']);expect(humanReport({}).rubric).toEqual([]);
 });
});

import shared from './fixtures/evaluation-display-v1.json';
for(const c of shared.math)it(`shared contract ${c.name}`,()=>expect(compareReports(mathReport(c.before),mathReport(c.after))?.[0].direction??null).toBe(c.expected));
for(const c of shared.ratings)it(`shared rating ${c.raw}`,()=>expect(rating(c.raw)).toBe(c.expected));
for(const c of shared.human)it(`shared human contract ${c.name}`,()=>{
 const before=humanReport(c.before,c.before.attempt.body,'',c.before.attempt),after=humanReport(c.after,c.after.attempt.body,'',c.after.attempt);
 expect(compareReports(before,{...after,priorId:before.id})?.[0].direction??null).toBe(c.expected);
 expect(before.rubric[0].stars).toBe(2);expect(after.rubric[0].stars).toBe(3);
});
it('prioritizes official criteria without inventing points and retains rubric verdicts',()=>{
 const r=mathReport({...wire(),criteria:[{criterion:{id:'official',description:'조건에 따른 경우를 모두 구분한다.'}}],output:{...wire().output,criteria:[{criterion_id:'official',verdict:'partially_satisfied',explanation:'한 경우가 빠졌어요.'}]}});
 expect(r.rubric[0]).toMatchObject({id:'criterion:official',name:'조건에 따른 경우를 모두 구분한다.',stars:null,feedback:'한 경우가 빠졌어요.'});
});
