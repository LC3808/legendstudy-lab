import {describe,it,expect} from 'vitest';
import {formatCreditGrantType as type,formatCreditReason as reason,formatCreditActor as actor} from './credit-display';
describe('shared Credit presentation',()=>{
 it.each([
  ['signup_bonus_v1','신규가입 무료'],['signup_bonus','신규가입 무료'],
  ['manual_support','관리자 지급'],['admin_grant','관리자 지급'],['promotion','이벤트 지급'],
  ['compensation','이용 보상'],['purchase','Credit 구매'],['refund','환불'],
 ])('maps %s to %s',(raw,label)=>expect(type(raw)).toBe(label));
 it('uses the actual recorded signup quantity',()=>{
  expect(reason('signup_bonus_v1',3)).toBe('가입 축하 Credit 3개');
  expect(reason('signup_bonus_v1',4)).toBe('가입 축하 Credit 4개');
  expect(reason('signup_bonus_v1')).toBe('가입 축하 Credit');
 });
 it('removes only the manual prefix without inventing compensation or changing the reason',()=>{
  expect(reason('manual_support: 오류')).toBe('오류');
  expect(reason('manual_support: 오류 보상')).toBe('오류 보상');
  expect(reason('manual_support: 재시도: 결과 확인')).toBe('재시도: 결과 확인');
  expect(reason('학습 지원')).toBe('학습 지원');
 });
 it.each([['system','자동 지급'],['operator','관리자'],['school_admin','학교 관리자'],['promotion_system','이벤트 자동 지급']])('formats actor kind and reference %s',(raw,label)=>{
  expect(actor(raw)).toBe(label);expect(actor(`${raw}/private-subject`)).toBe(label);
 });
 it('handles missing and future codes without leaking internal actor IDs or object properties',()=>{
  expect(type('future_credit')).toBe('기타 Credit 내역');expect(type(null)).toBe('구분 미제공');
  expect(actor('future_actor/private-uuid')).toBe('기타 주체');expect(actor(null)).toBe('주체 미제공');
  expect(reason(null)).toBe('사유 미제공');expect(type('toString')).toBe('기타 Credit 내역');expect(actor('__proto__')).toBe('기타 주체');expect(reason('constructor')).toBe('constructor');
 });
});
