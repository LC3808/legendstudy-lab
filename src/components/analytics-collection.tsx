'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {browserGa4} from '@/lib/analytics/ga4';
export function AnalyticsCollection() {
  const pathname = usePathname();
  useEffect(() => {
    try { browserGa4()?.pageView(); } catch { /* Analytics cannot block navigation. */ }
  }, [pathname]);
  return null;
}
