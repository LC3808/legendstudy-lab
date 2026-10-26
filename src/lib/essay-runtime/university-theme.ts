import brands from '@/data/university-brands.json';

/** Public presentation metadata only; never an execution/availability policy. */
export const universityBrands = brands;
export function universityEssayTheme(sourceId: string) {
 const brand = brands[sourceId as keyof typeof brands];
 return {
  ...brand,
  accent: brand?.primary_color ?? '#244A6A',
  // UI tint, not another official university color.
  tint: '#F5F7FA',
  background_color: brand?.background_color ?? '#FFFFFF',
  border_color: brand?.border_color ?? '#DCE4EC',
  logo_asset: brand?.logo_asset,
 };
}
