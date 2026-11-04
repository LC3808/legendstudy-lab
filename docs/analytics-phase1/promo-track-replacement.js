/* TASK15 track() replacement only; do not add another GA tag/config. */
var lsPromoTracked = {};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function track(name, params) {
  var allowed = ['app_promo_impression','app_promo_click','app_promo_dismiss','app_promo_snooze'];
  if (allowed.indexOf(name) === -1 || lsPromoTracked[name]) return;
  var clean = {send_to:'G-295EQHYTCK'};
  params = params || {};
  if (['ios','android','other','web'].indexOf(params.platform) >= 0) clean.platform = params.platform;
  if (params.placement === 'mobile_web') clean.placement = 'mobile_web';
  if (['ios','android','appstore','googleplay','app_store','google_play'].indexOf(params.store) >= 0) clean.store = params.store;
  if (['close','backdrop','escape'].indexOf(params.reason) >= 0) clean.reason = params.reason;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, clean);
    } else {
      window.dataLayer = window.dataLayer || [];
      // Google tag consumes the arguments object, not an ordinary Array.
      (function(){ window.dataLayer.push(arguments); })('event', name, clean);
    }
    lsPromoTracked[name] = true;
  } catch { /* Do not block the modal or store navigation; permit a later retry. */ }
}
