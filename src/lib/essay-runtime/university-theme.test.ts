import {existsSync} from 'node:fs';
import {expect,it} from 'vitest';
import catalog from '@/data/essay-public-catalog.json';
import logos from '@/data/university-logos.json';
import {universityBrands,universityEssayTheme} from './university-theme';

it('covers the complete catalog without changing identities or logo assets',()=>{
 expect(Object.keys(universityBrands).sort()).toEqual(catalog.universities.map(u=>u.sourceUniversityId).sort());
 for(const u of catalog.universities){
  const b=universityBrands[u.sourceUniversityId as keyof typeof universityBrands];
  expect(b.university_id).toBe(u.universityId);
  expect(b.university_name).toBe(u.name);
  expect(b.logo_asset).toBe(logos[u.sourceUniversityId as keyof typeof logos]?.src??null);
  if(b.logo_asset)expect(existsSync(`public${b.logo_asset}`)).toBe(true);
  expect(b.background_color).toBe('#FFFFFF');
 }
});
it('only uses original-verified HEX/RGB as official accents',()=>{
 for(const b of Object.values(universityBrands)){
  expect(b.color_usage==='official_accent').toBe(['A_OFFICIAL_HEX','B_OFFICIAL_RGB'].includes(b.verification_status));
  if(b.color_usage==='official_accent'){
   expect(b.color_source).toMatch(/^https:\/\//);
   expect(b.verified_at).toBeTruthy();
  }
  if(b.official_rgb)expect('#'+b.official_rgb.map(c=>c.toString(16).padStart(2,'0')).join('').toUpperCase()).toBe(b.primary_color);
 }
 expect(universityEssayTheme('kyunghee').accent).toBe('#A40F16'); // Original B22, not Manus B2.
 expect(universityEssayTheme('korea').color_usage).toBe('temporary_ui');
 expect(universityEssayTheme('sogang').color_usage).toBe('temporary_ui');
 expect(universityEssayTheme('unknown').accent).toBe('#244A6A');
});
it('retains both research mappings separately from official verification',()=>{
 expect(Object.values(universityBrands).filter(b=>b.manus_matched)).toHaveLength(27);
 expect(Object.values(universityBrands).filter(b=>b.claude_matched)).toHaveLength(33);
 expect(universityEssayTheme('swu').accent).toBe('#9E1A20');
 expect(universityEssayTheme('ewha').accent).toBe('#00462A');
 expect(universityEssayTheme('kau').accent).toBe('#002870');
});
