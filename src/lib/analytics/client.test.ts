import {describe,it,expect,vi} from 'vitest';
import {createAnalytics,sanitizeAnalyticsParams} from './client';
import {analyticsEvents as E} from './events';
describe('Claude v1 browser adapter',()=>{
 it('drops PII, payloads, IDs, nonfinite numbers and unsupported types',()=>{
  expect(sanitizeAnalyticsParams({email:'private',body:'answer',run_id:'r',question_count:NaN,status:{body:'secret'},is_free:true,source:' web '})).toEqual({is_free:1,source:'web'});
 });
 it('does not initialize or send when disabled/missing',()=>{
  const transport=vi.fn();createAnalytics(()=>false,transport)(E.login);expect(transport).not.toHaveBeenCalled();
  expect(()=>createAnalytics(()=>true,()=>undefined)(E.login)).not.toThrow();
 });
 it('dedupes the same request across repeated observations, without losing distinct stages',()=>{
  const send=vi.fn(),log=createAnalytics(()=>true,()=>send);
  for(let i=0;i<3;i++){log(E.essaySubmitStart,{question_count:2},'private-request');log(E.essaySubmitAccepted,{is_free:true},'private-request');}
  expect(send).toHaveBeenCalledTimes(2);expect(JSON.stringify(send.mock.calls)).not.toContain('private-request');
 });
 it('transport failures cannot block a submission or auth action',()=>{
  const log=createAnalytics(()=>true,()=>{throw Error('offline');});expect(()=>log(E.essaySubmitStart)).not.toThrow();
  expect(()=>createAnalytics(()=>true,()=>()=>{throw Error('offline');})(E.login)).not.toThrow();
 });
 it('ignores non-contract events and caps allowed strings',()=>{
  const send=vi.fn(),log=createAnalytics(()=>true,()=>send);log('answer_text',{source:'private'});expect(send).not.toHaveBeenCalled();
  log(E.login,{source:'x'.repeat(200)});expect(send.mock.calls[0][2].source).toHaveLength(100);
 });
 it('does not mark a missing transport observation as delivered',()=>{
  let available=false;const send=vi.fn(),log=createAnalytics(()=>true,()=>available?send:undefined);log(E.login,{},'same');available=true;log(E.login,{},'same');expect(send).toHaveBeenCalledOnce();
 });
});
