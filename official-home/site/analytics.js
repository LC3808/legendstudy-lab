// Existing marketing banner_click contract. This records navigation intent, never an install,
// completed evaluation or purchase. LAB Analytics v1's 31 events/14 properties stay unchanged.
export function installHomeAnalytics(win, runtime) {
  const seen = new WeakSet();
  const destinations = new Set(['app_store', 'google_play', 'essay_lab', 'legendstudy']);
  const placements = new Set(['hero', 'download', 'essay']);
  const onClick = (event) => {
    if (seen.has(event)) return;
    seen.add(event);
    const link = event.target?.closest?.('a[data-destination]');
    if (!link || !destinations.has(link.dataset.destination) || !placements.has(link.dataset.placement)) return;
    try {
      runtime.transport()?.('event', 'banner_click', {
        platform: 'web', screen: 'official_home',
        source: `${link.dataset.placement}:${link.dataset.destination}`,
      });
    } catch { /* Measurement must never block navigation. */ }
  };
  try { runtime.pageView(); } catch { /* Noop on unavailable measurement. */ }
  win.document.addEventListener('click', onClick);
  return () => win.document.removeEventListener('click', onClick);
}

