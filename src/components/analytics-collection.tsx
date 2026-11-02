'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {logAnalytics} from '@/lib/analytics/client';
import {analyticsEvents} from '@/lib/analytics/events';
import {browserGa4} from '@/lib/analytics/ga4';
export function AnalyticsCollection() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      browserGa4()?.pageView();
      if (pathname?.replace(/\/+$/, '') === '/essay-lab') {
        logAnalytics(analyticsEvents.essayLabView, {screen:'essay_lab'}, 'essay_lab');
      }
    } catch { /* Analytics cannot block navigation. */ }
  }, [pathname]);
  return null;
}
