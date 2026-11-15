// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
const auth=vi.hoisted(()=>({user:{id:'operator'},client:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}}}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>auth}));
import {AppUsageReport} from './app-usage-report';
const view=()=> <AppUsageReport window={{p_from:'2026-10-31T15:00:00Z',p_to:'2026-11-05T15:00:00Z'}} refresh="1"/>;
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('unconnected never fabricates zeros or retains old menu TOP3',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({version:'ga4-app-usage-v1',state:'UNCONNECTED'}))));
 render(view());expect(await screen.findByText(/미연결 · 앱 Analytics/)).toBeVisible();expect(screen.queryByText('0명')).toBeNull();
});
it('waiting, missing dimensions, genuine zero, thresholds and unavailable title are distinct',async()=>{
 const empty={columns:['eventCount','totalUsers'],rows:[],limited:false,totalRows:0};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({version:'ga4-app-usage-v1',state:'CONNECTED',propertyId:'396674471',streamIds:['111'],from:'2026-11-01',to:'2026-11-05',timeZone:'Asia/Seoul',fetchedAt:'2026-11-05T00:00:00Z',active:[{days:1,users:null},{days:7,users:0},{days:30,users:7}],menusByUsers:null,menusByViews:empty,materials:empty,missingDimensions:['menu_id'],thresholded:true,titlesUnavailable:true}))));
 render(view());expect(await screen.findByText('수집 대기')).toBeVisible();expect(screen.getByText('0명')).toBeVisible();expect(screen.getByText('7명')).toBeVisible();expect(screen.getAllByText(/수집 대기 · 선택 기간/)).toHaveLength(2);expect(screen.getAllByText(/미연결 · 이벤트 보고서/).length).toBeGreaterThan(0);expect(screen.getByText(/GA4 집계 제한/)).toBeVisible();
});
it('API error is not no data',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({code:'READ_UNAVAILABLE'}),{status:502})));
 render(view());expect(await screen.findByRole('alert')).toHaveTextContent('0명이라는 뜻이 아닙니다');
});
