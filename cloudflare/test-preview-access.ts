/** TASK09 private TEST site only. This gate never authorizes Supabase/admin access. */
export type PreviewEnv = { TEST_PREVIEW_ACCESS_KEY?: string };
const host = /^(?:[a-z0-9-]+\.)?legendstudy-(?:task09|task16b)\.pages\.dev$/;
const cookieName = '__Host-task09_review';
const lifetime = 8 * 60 * 60;
const encoder = new TextEncoder();
async function signature(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function response(body: string, status: number, extra: Record<string, string> = {}) {
  return new Response(body, { status, headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...extra,
  } });
}
export async function testPreviewAccess(request: Request, env: PreviewEnv, next: () => Promise<Response>, now = Date.now()): Promise<Response> {
  const url = new URL(request.url);
  if (!host.test(url.hostname)) return next();
  const secret = env.TEST_PREVIEW_ACCESS_KEY;
  if (url.protocol !== 'https:' || !secret || secret.length < 32) return response('TEST preview unavailable', 503);
  // Existing Worker-to-Pages Math callback only; this does not authorize the
  // callback itself, whose service credential and parent lease are still checked.
  const machine=request.headers.get('X-Test-Preview-Access')||'';
  if(url.hostname==='legendstudy-task16b.pages.dev'&&url.pathname==='/api/essay/math-session'&&request.method==='POST'&&machine&&equal(await signature(secret,machine),await signature(secret,secret)))return next();
  // Native has no browser review cookie. These exact TEST API routes still verify
  // the Auth JWT, active owner and server Math allowlist in their own gateways.
  if(url.hostname==='legendstudy-task16b.pages.dev'&&request.method==='POST'&&
    /^\/api\/math\/(upload|extract|evaluate|recover)$/.test(url.pathname)&&
    /^Bearer [^\s]+$/.test(request.headers.get('authorization')||''))return next();
  if(url.hostname==='legendstudy-task16b.pages.dev'&&request.method==='GET'&&['/api/essay/availability','/api/essay/student-pdfs'].includes(url.pathname)&&/^Bearer [^\s]+$/.test(request.headers.get('authorization')||''))return next();
  if(url.hostname==='legendstudy-task16b.pages.dev'&&request.method==='POST'&&url.pathname==='/api/essay/catalog'&&/^Bearer [^\s]+$/.test(request.headers.get('authorization')||''))return next();
  const seconds = Math.floor(now / 1000);
  if (url.pathname === '/__review-access' && request.method === 'POST') {
    if (request.headers.get('origin') !== url.origin) return response('Forbidden', 403);
    if (Number(request.headers.get('content-length') || 0) > 1024) return response('Too large', 413);
    const body = await request.text();
    if (body.length > 1024) return response('Too large', 413);
    const provided = new URLSearchParams(body).get('access_key') || '';
    if (!equal(await signature(secret, provided), await signature(secret, secret))) return response('접속 코드가 올바르지 않습니다.', 403);
    const payload = String(seconds + lifetime);
    const value = payload + '.' + await signature(secret, url.hostname + ':' + payload);
    return response('', 303, { Location: '/', 'Set-Cookie': `${cookieName}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${lifetime}` });
  }
  const value = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
  const [expiry, mac] = value.split('.');
  if (/^\d{10}$/.test(expiry) && Number(expiry) > seconds && Number(expiry) <= seconds + lifetime && mac && equal(mac, await signature(secret, url.hostname + ':' + expiry))) {
    const result = await next();
    const headers = new Headers(result.headers);
    headers.set('Cache-Control', 'no-store'); headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return new Response(result.body, { status: result.status, statusText: result.statusText, headers });
  }
  return response('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LegendStudy 비공개 TEST</title><h1>Owner 비공개 TEST 환경</h1><p>검수 접속 코드를 입력한 뒤 별도의 TEST 계정으로 로그인하세요.</p><form method="post" action="/__review-access"><label>접속 코드 <input name="access_key" type="password" required autocomplete="current-password"></label><button>검수 환경 열기</button></form></html>', 401);
}
