import brands from '@/data/university-brands.json';

/** Public presentation metadata only; never an execution/availability policy. */
export const universityBrands = brands;
// Choose the higher-contrast neutral foreground; this is not an official brand color.
export function brandTextColor(hex: string) {
 const rgb=hex.replace('#','').match(/.{2}/g)!.map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 return 1.05/(luminance+.05)>=(luminance+.05)/.05?'#FFFFFF':'#000000';
}
export function universityEssayTheme(sourceId: string) {
 const brand = brands[sourceId as keyof typeof brands];
 return {
  ...brand,
  accent: brand?.primary_color ?? '#244A6A',
  buttonTextColor: brandTextColor(brand?.primary_color ?? '#244A6A'),
  // UI tint, not another official university color.
  tint: '#F5F7FA',
  background_color: brand?.background_color ?? '#FFFFFF',
  border_color: brand?.border_color ?? '#DCE4EC',
  logo_asset: brand?.logo_asset,
 };
}
