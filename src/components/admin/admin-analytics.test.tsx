// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AuthContext,type AuthContextValue} from '@/components/auth-context';
import {AdminSurface} from './admin-surface';
import {AdminAnalytics} from './admin-analytics';
function auth(id:string|null,allowed=true):AuthContextValue {
 const rpc=vi.fn(async(name:string)=>name==='admin_operator'?{data:allowed,error:null}:{data:null,error:{code:'PGRST202',message:'private diagnostic'}});
 return {status:id?'authenticated':'anonymous',user:id?{id}:null,recoveryActive:false,completeRecovery:()=>{},signOut:async()=>{},client:{rpc,auth:{getSession:async()=>({data:{session:id?{user:{id},access_token:'test-token'}:null}})}} as unknown as SupabaseClient};
}
const view=(value:AuthContextValue)=><AuthContext.Provider value={value}><AdminSurface active="analytics" title="통합 분석" eyebrow="운영"><AdminAnalytics/></AdminSurface></AuthContext.Provider>;
describe('integrated analytics read-only surface',()=>{
 beforeEach(()=>vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({code:'NOT_CONFIGURED'}),{status:503}))));
 afterEach(()=>vi.unstubAllGlobals());
 it('keeps missing RPC distinct from zero and reuses existing quality routes',async()=>{
  const a=auth('owner');render(view(a));
  await screen.findAllByText(/운영 조회 기능이 아직 연결되지 않았습니다/);
  expect(screen.getByRole('link',{name:'첨삭 품질 검수 →'})).toHaveAttribute('href','/ql');
  expect(screen.getByRole('link',{name:'실제 답안·재첨삭 비교 검수 →'})).toHaveAttribute('href','/owner-review/essay');
  expect(screen.queryByText('private diagnostic')).toBeNull();
  expect(screen.getByText(/GA4 보고서 데이터 연결이 필요합니다/)).toBeInTheDocument();
  expect(screen.getByText('속성 396674471 · 위 보고서의 조회 상태 참조')).toBeInTheDocument();
  expect(screen.getByText('전용 GA4 속성 확인 필요 · 보고서 미연결')).toBeInTheDocument();
  expect(screen.getByText(/교차 서비스 전환율을 계산하지 않습니다/)).toBeInTheDocument();
  await waitFor(()=>expect(a.client?.rpc).toHaveBeenCalledWith('analytics_kpi_overview',expect.objectContaining({p_from:expect.any(String),p_to:expect.any(String)})));
 });
 it.each([null,'ordinary'])('does not request reports when denied %s',async id=>{
  const a=auth(id,false);render(view(a));await screen.findByText(id?'운영자 권한이 없습니다':'로그인이 필요합니다');
  expect(vi.mocked(a.client!.rpc).mock.calls.some(call=>String(call[0]).startsWith('analytics_'))).toBe(false);
 });
 it('unmounts private reports on logout',async()=>{const a=auth('owner');const r=render(view(a));await screen.findByText(/GA4 보고서 데이터/);r.rerender(view(auth(null)));await screen.findByText('로그인이 필요합니다');expect(screen.queryByText(/GA4 보고서 데이터/)).toBeNull();});
});
