// Collection configuration is independent of server-side GA4 reporting access.
export type Ga4Config = {enabled: boolean; measurementId: string; origins: string[]; privacyReviewed: boolean; pageTitle?: string};
export const ga4Config: Ga4Config = {
  enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true',
  measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? '',
  origins: (process.env.NEXT_PUBLIC_GA4_ALLOWED_ORIGINS ?? '').split(',').map(v => v.trim()).filter(Boolean),
  // Review individual automatic events against manual collection; do not disable all enhanced measurement.
  privacyReviewed: process.env.NEXT_PUBLIC_GA4_PRIVACY_REVIEWED === 'true',
};
export function collectionReadiness(config: Ga4Config): string {
  if (!config.enabled) return '미연결 · 수집 비활성';
  if (!/^G-[A-Z0-9]{6,20}$/.test(config.measurementId)) return '설정 필요 · LAB 측정 ID';
  if (!config.origins.length || !config.privacyReviewed) return '설정 필요 · 허용 도메인 및 개인정보 설정';
  return '수집 대기 · 설정 존재, 실제 수신 미검증';
}
// Never transmit query strings, identifiers, user titles, OAuth callbacks or unknown paths.
const paths = ['/', '/login', '/signup', '/pricing', '/essay-lab', '/essay-lab/universities', '/essay-lab/write', '/my/essays', '/my/essays/result', '/my/pattern', '/notices', '/notices/detail', '/support'];
export function analyticsPath(pathname: string): string | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (paths.includes(path)) return path;
  for (const prefix of ['/essay-lab/evaluation/', '/essay-lab/questions/', '/essay-lab/write/', '/essay-lab/universities/']) {
    if (path.startsWith(prefix)) return prefix + 'item';
  }
  return null;
}
export function safeReferrer(raw: string): string {
  try {
    const {hostname} = new URL(raw);
    // Keep only known referral origins, never arbitrary URLs or campaign/user input.
    const allowed = ['legendstudy.com', 'www.legendstudy.com', 'home.legendstudy.com', 'google.com', 'www.google.com', 'search.naver.com', 'm.search.naver.com', 'naver.com'];
    return allowed.includes(hostname) ? `https://${hostname}/` : '';
  } catch { return ''; }
}
type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = Window & {gtag?: Gtag; dataLayer?: unknown[]};
export function createGa4Runtime(config: Ga4Config, win: AnalyticsWindow) {
  let started = false;
  let failed = false;
  let lastPath: string | null = null;
  function context() {
    const path = analyticsPath(win.location.pathname);
    if (!path || !config.enabled || !config.privacyReviewed || !/^G-[A-Z0-9]{6,20}$/.test(config.measurementId) || !config.origins.includes(win.location.origin)) return null;
    return {page_location: win.location.origin + path, page_title: config.pageTitle ?? 'LegendStudy LAB', page_referrer: safeReferrer(win.document.referrer)};
  }
  function start() {
    const page = context();
    if (started) Reflect.set(win, `ga-disable-${config.measurementId}`, !page || failed);
    if (!page || failed) return false;
    if (started) return true;
    // An external tag manager/gtag needs separate review; do not configure or duplicate it.
    if (win.gtag || win.document.querySelector('script[src*="googletagmanager.com"]')) return false;
    win.dataLayer = win.dataLayer ?? [];
    // Preserve Google's documented gtag command-queue Arguments object format.
    // eslint-disable-next-line prefer-rest-params
    win.gtag = function () { win.dataLayer!.push(arguments); };
    win.gtag('consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    win.gtag('js', new Date());
    win.gtag('set', {...page, allow_google_signals: false, allow_ad_personalization_signals: false});
    win.gtag('config', config.measurementId, {...page, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false});
    const script = win.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
    script.referrerPolicy = 'no-referrer';
    script.onerror = () => { failed = true; };
    win.document.head.appendChild(script);
    started = true;
    return true;
  }
  function pageView() {
    if (!start()) { lastPath = null; return; }
    const page = context()!;
    if (lastPath === page.page_location) return;
    win.gtag!('set', page);
    win.gtag!('event', 'page_view', {...page, send_to: config.measurementId});
    lastPath = page.page_location;
  }
  return {
    pageView,
    transport() {
      if (!start()) return undefined;
      return (command: 'event', name: string, params: Record<string, string | number>) => {
        const page = context();
        if (!page || failed) return;
        win.gtag!('set', page);
        win.gtag!(command, name, {...params, ...page, send_to: config.measurementId});
      };
    },
  };
}
let runtime: ReturnType<typeof createGa4Runtime> | undefined;
export function browserGa4() {
  if (typeof window === 'undefined') return undefined;
  return runtime ??= createGa4Runtime(ga4Config, window);
}
