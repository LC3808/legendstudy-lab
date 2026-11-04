// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {AuthContext,type AuthContextValue} from '@/components/auth-context';
import {Ga4Report} from './ga4-report';
import {gaDates,type GaReport} from '@/lib/admin/ga4-report';
const window={p_from:'2026-10-31T15:00:00.000Z',p_to:'2026-11-02T15:00:00.000Z'};
const table={columns:['activeUsers'],rows:[],totalRows:0,limited:false};
const report:GaReport={version:'ga4-report-v1',source:'GA4',propertyId:'396674471',streamId:'5829568136',startDate:'2026-11-01',endDate:'2026-11-02',timeZone:'Asia/Seoul',fetchedAt:'2026-11-02T12:00:00Z',summary:{...table,rows:[{label:'전체',values:[123]}]},daily:table,channels:table,pages:table,events:table,returning:table,thresholded:false,sampled:false,dataLoss:false};
const auth={user:{id:'owner'},client:{auth:{getSession:async()=>({data:{session:{access_token:'test-token'}}})}}} as unknown as AuthContextValue;
const view=(refresh='1',value=auth)=><AuthContext.Provider value={value}><Ga4Report window={window} refresh={refresh}/></AuthContext.Provider>;
afterEach(()=>vi.unstubAllGlobals());
describe('GA4 reporting UI',()=>{
 it('converts KST exclusive bounds to inclusive GA days',()=>expect(gaDates(window)).toEqual({from:'2026-11-01',to:'2026-11-02'}));
 it('shows source, period and real response; missing promo is not zero installs',async()=>{const f=vi.fn(async()=>new Response(JSON.stringify(report)));vi.stubGlobal('fetch',f);render(view());await screen.findByText('123');expect(screen.getByText(/CONNECTED · Google/)).toBeInTheDocument();expect(screen.getAllByText(/NOT_COLLECTED/)).toHaveLength(4);expect(screen.getByText(/실제 설치 완료: NOT_AVAILABLE/)).toBeInTheDocument();expect(f).toHaveBeenCalledWith('/api/admin/ga4?from=2026-11-01&to=2026-11-02',expect.objectContaining({cache:'no-store'}));});
 it.each(['PERMISSION_REQUIRED','API_DISABLED','NOT_CONFIGURED','READ_UNAVAILABLE'])('shows %s instead of zero',async code=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({code}),{status:503})));render(view());expect(await screen.findByRole('alert')).toBeInTheDocument();expect(document.querySelector('dd')).toBeNull();expect(screen.queryByText('123')).toBeNull();});
 it('clears old metrics while refreshing and does not let late response replace new one',async()=>{let resolve!:(v:Response)=>void;const f=vi.fn().mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValueOnce(new Response(JSON.stringify({...report,summary:{...table,rows:[{label:'전체',values:[456]}]}})));vi.stubGlobal('fetch',f);const r=render(view());await waitFor(()=>expect(f).toHaveBeenCalledTimes(1));r.rerender(view('2'));await screen.findByText('456');resolve(new Response(JSON.stringify(report)));await waitFor(()=>expect(screen.queryByText('123')).toBeNull());});
});
