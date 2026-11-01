// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue } from '@/components/auth-context';
import { AdminSurface } from './admin-surface';
import { describeError } from '@/lib/admin/errors';

function auth(allowed: boolean, status: AuthContextValue['status'] = 'authenticated'): AuthContextValue {
 return {status, user: status === 'authenticated' ? {id:'test'} : null, recoveryActive:false, completeRecovery:()=>{}, signOut:async()=>{},
 client:{rpc:vi.fn(async()=>({data:allowed,error:null})),auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'test'}}}}))}} as unknown as SupabaseClient};
}
function view(value:AuthContextValue){return <AuthContext.Provider value={value}><AdminSurface active="beta-usage" eyebrow="운영" title="검수"><p>운영 데이터</p></AdminSurface></AuthContext.Provider>;}
describe('existing admin LAB routes',()=>{
 it('groups six unique links and preserves existing routes and active page',async()=>{
  render(view(auth(true)));
  const nav=await screen.findByRole('navigation',{name:'운영 콘솔'});
  expect(within(nav).getByRole('region',{name:'베타 운영'})).toBeVisible();
  const expected=[['사용자 행동 분석','analytics'],['베타 테스트 관리','beta'],['베타 이용 현황','beta/usage'],['평가·비용 모니터링','operations'],['피드백·오류 신고','essay-feedback'],['공지사항 관리','notices']];
  expect(within(nav).getAllByRole('link').length).toBeGreaterThan(25);
  for(const [label,path] of expected)expect(within(nav).getByRole('link',{name:label})).toHaveAttribute('href',`/admin/${path}`);
  expect(screen.getByRole('link',{name:'베타 이용 현황'})).toHaveAttribute('aria-current','page');
  expect(screen.getByRole('link',{name:'회원'})).toHaveAttribute('href','/admin/members');
  expect(screen.getByRole('link',{name:'평가 실패·복구 내역'})).toHaveAttribute('href','/admin/beta/failures');
  const urls=within(nav).getAllByRole('link').map(a=>a.getAttribute('href'));expect(new Set(urls).size).toBe(urls.length);
 });
 it.each(['anonymous','authenticated'] as const)('hides navigation and content for denied %s',async status=>{
  render(view(auth(false,status)));await screen.findByText(status==='anonymous'?'로그인이 필요합니다':'운영자 권한이 없습니다');
  expect(screen.queryByRole('navigation')).toBeNull();expect(screen.queryByText('운영 데이터')).toBeNull();
 });
 it.each([['PGRST202','운영 조회 기능이 아직 연결되지 않았습니다'],['42501','운영자 권한이 없습니다'],['PT403','운영자 권한이 없습니다']])('distinguishes %s without exposing server messages',(code,title)=>{
  const result=describeError({code,message:'secret database diagnostics'});expect(result).toContain(title);expect(result).not.toContain('secret');
 });
 it('distinguishes connection failure',()=>expect(describeError(new TypeError('Failed to fetch'))).toContain('연결이 원활하지 않습니다'));
});
