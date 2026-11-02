// @vitest-environment jsdom
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {analyticsPath,collectionReadiness,createGa4Runtime,safeReferrer,type Ga4Config} from './ga4';
const config: Ga4Config = {enabled:true,measurementId:'G-TEST123456',origins:[window.location.origin],privacyReviewed:true};
type TestWindow = Window & {gtag?: (...args:unknown[])=>void;dataLayer?: unknown[]};
const win = window as TestWindow;
const calls = () => (win.dataLayer ?? []).map(row=>Array.from(row as ArrayLike<unknown>));
beforeEach(()=>{delete win.gtag;delete win.dataLayer;document.head.innerHTML='';history.replaceState(null,'','/essay-lab');});
describe('GA4 collection bootstrap (no network)',()=>{
 it.each([{enabled:false},{measurementId:''},{measurementId:'G-<script>'},{origins:['https://other.test']},{privacyReviewed:false}])('fails closed for missing/invalid configuration %j',patch=>{
  const runtime=createGa4Runtime({...config,...patch},win);runtime.pageView();expect(runtime.transport()).toBeUndefined();expect(document.querySelector('script')).toBeNull();expect(calls()).toEqual([]);
 });
 it('loads once, disables automatic views and ads, dedupes StrictMode effects but counts a return visit',()=>{
  const runtime=createGa4Runtime(config,win);runtime.pageView();runtime.pageView();
  history.pushState(null,'','/pricing');runtime.pageView();history.pushState(null,'','/essay-lab');runtime.pageView();
  expect(document.querySelectorAll('script')).toHaveLength(1);
  expect(calls().filter(v=>v[0]==='config')).toEqual([['config',config.measurementId,expect.objectContaining({send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false})]]);
  expect(calls().filter(v=>v[1]==='page_view')).toHaveLength(3);
 });
 it('never includes OAuth/query/hash, result identifiers, document titles or arbitrary referrers',()=>{
  document.title='private student name';history.replaceState(null,'','/essay-lab/evaluation/private-run?answer=secret#token');
  const runtime=createGa4Runtime(config,win);runtime.pageView();runtime.transport()?.('event','essay_result_view',{platform:'web'});
  const serialized=JSON.stringify(calls());for(const secret of ['private-run','answer=','secret','token','private student'])expect(serialized).not.toContain(secret);
  expect(serialized).toContain('/essay-lab/evaluation/item');
  expect(safeReferrer('https://www.legendstudy.com/private?q=secret')).toBe('https://www.legendstudy.com/');
  expect(safeReferrer('https://secret.example/student')).toBe('');
 });
 it.each(['/admin/analytics','/owner-review/essay','/ql','/reset-password','/unknown/private'])('does not initialize on sensitive/unknown route %s',path=>{
  history.replaceState(null,'',path);const runtime=createGa4Runtime(config,win);runtime.pageView();expect(runtime.transport()).toBeUndefined();expect(calls()).toEqual([]);
 });
 it('blocks collection after navigating from a public page to an admin page',()=>{
  const runtime=createGa4Runtime(config,win);runtime.pageView();const send=runtime.transport();const before=calls().length;
  history.pushState(null,'','/admin/analytics?secret=private');runtime.pageView();send?.('event','login',{});expect(calls()).toHaveLength(before);
  expect(win['ga-disable-G-TEST123456' as keyof TestWindow]).toBe(true);
  history.pushState(null,'','/essay-lab');runtime.pageView();
  expect(win['ga-disable-G-TEST123456' as keyof TestWindow]).toBe(false);
 });
 it('does not take over an existing tag',()=>{win.gtag=vi.fn();const runtime=createGa4Runtime(config,win);runtime.pageView();expect(win.gtag).not.toHaveBeenCalled();expect(document.querySelector('script')).toBeNull();});
 it('loader failure stops later events without affecting the user flow',()=>{
  const runtime=createGa4Runtime(config,win);runtime.pageView();document.querySelector('script')!.dispatchEvent(new Event('error'));
  const before=calls().length;expect(()=>runtime.pageView()).not.toThrow();expect(runtime.transport()).toBeUndefined();expect(calls()).toHaveLength(before);
 });
 it('never labels configuration as confirmed delivery',()=>{
  expect(collectionReadiness({...config,enabled:false})).toContain('비활성');expect(collectionReadiness({...config,measurementId:''})).toContain('측정 ID');expect(collectionReadiness(config)).toContain('실제 수신 미검증');expect(analyticsPath('/my/essays/result?run=secret')).toBe('/my/essays/result');
 });
});

it('allows signup with a sanitized URL and preserves the known home referrer',()=>{
 expect(analyticsPath('/signup?token=secret')).toBe('/signup');
 expect(safeReferrer('https://home.legendstudy.com/?email=private')).toBe('https://home.legendstudy.com/');
});
