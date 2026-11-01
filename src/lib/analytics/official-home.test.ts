// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {installHomeAnalytics} from '../../../official-home/site/analytics.js';

import {createGa4Runtime} from './ga4';
const html = readFileSync('official-home/site/index.html', 'utf8');
const config = {enabled: true, measurementId: 'G-TEST123456', privacyReviewed: true,
  origins: [window.location.origin], pageTitle: '레전드스터디+ 공식 홈페이지'};
const win = window as Window & {dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void};
let dispose: (() => void) | undefined;
const events = () => (win.dataLayer ?? []).map(args => Array.from(args)).filter(row => row[0] === 'event');
beforeEach(() => {
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
  document.querySelectorAll('script').forEach(script => script.remove());
  delete win.gtag; delete win.dataLayer;
});
afterEach(() => { dispose?.(); delete win.gtag; delete win.dataLayer; });

describe('official homepage launch', () => {
  it('keeps exact destinations, policy links and unreleased scope honest', () => {
    expect(document.querySelectorAll('a[href*="id6820826957"]')).toHaveLength(2);
    expect(document.querySelectorAll('a[href*="id=com.legendstudy.app"]')).toHaveLength(2);
    for (const path of ['support', 'privacy', 'terms', 'refund', 'account-deletion']) {
      expect(document.querySelector(`a[href="https://lab.legendstudy.com/${path}/"]`)).not.toBeNull();
    }
    expect(document.body.textContent).not.toContain('출시 준비 중');
    expect(document.body.textContent).toContain('수리논술은 준비 중');
  });
  it('is Noop when disabled or missing reviewed settings', () => {
    for (const override of [{enabled:false}, {measurementId:''}, {privacyReviewed:false}, {origins:[]}]) {
      dispose = installHomeAnalytics(win, createGa4Runtime({...config, ...override}, win));
      const click = new MouseEvent('click', {bubbles:true, cancelable:true});
      click.preventDefault();
      document.querySelector('a[data-destination]')!.dispatchEvent(click);
      expect(win.dataLayer).toBeUndefined();
      expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
      dispose();
    }
  });
  it('records six outbound intents once per DOM event, without URLs or user content', () => {
    dispose = installHomeAnalytics(win, createGa4Runtime(config, win));
    document.querySelectorAll<HTMLAnchorElement>('a[data-destination]').forEach(link => {
      const event = new MouseEvent('click', {bubbles:true, cancelable:true});
      event.preventDefault();
      link.dispatchEvent(event); link.dispatchEvent(event);
    });
    const clicks = events().filter(row => row[1] === 'banner_click');
    expect(clicks).toHaveLength(6);
    expect(events().filter(row => row[1] === 'page_view')).toHaveLength(1);
    expect(new Set(clicks.map(row => (row[2] as {source: string}).source))).toEqual(new Set([
      'hero:app_store', 'hero:google_play', 'essay:essay_lab',
      'download:app_store', 'download:google_play', 'download:legendstudy',
    ]));
    for (const row of clicks) {
      expect(Object.keys(row[2] as object).sort()).toEqual([
        'page_location', 'page_referrer', 'page_title', 'platform', 'screen', 'send_to', 'source',
      ]);
    }
    expect(JSON.stringify(clicks)).not.toMatch(/email|id6820826957|com.legendstudy.app|purchase_success|essay_lab_view/);
  });
  it('ignores unknown destinations and leaves navigation available when telemetry fails', () => {
    dispose = installHomeAnalytics(win, createGa4Runtime(config, win));
    win.gtag = () => { throw Error('unavailable'); };
    const link = document.querySelector<HTMLAnchorElement>('a[data-destination]')!;
    const event = new MouseEvent('click', {bubbles:true, cancelable:true});
    // Use a document listener to avoid jsdom navigation after verifying no preventDefault.
    document.addEventListener('click', e => { expect(e.defaultPrevented).toBe(false); e.preventDefault(); }, {once:true});
    expect(() => link.dispatchEvent(event)).not.toThrow();
    link.dataset.destination = 'private-answer';
    const ignored = new MouseEvent('click', {bubbles:true, cancelable:true});
    ignored.preventDefault(); link.dispatchEvent(ignored);
    expect(events().filter(row => row[1] === 'banner_click')).toHaveLength(0);
  });
});
