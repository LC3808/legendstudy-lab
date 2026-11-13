import {describe,it,expect} from 'vitest';
import reviewed from '@/data/essay-university-schedules.json';
import {catalogUniversity} from './public-discovery';
import {scheduleDateLabel,universitySchedules} from './university-schedules';
import {brandTextColor,universityBrands} from './university-theme';
describe('reviewed public schedules',()=>{
 it('keeps civil weekdays stable and never invents a date',()=>{
  expect(scheduleDateLabel('2026-11-21')).toBe('2026-11-21 (토)');
  expect(scheduleDateLabel('2026-11-22')).toBe('2026-11-22 (일)');
  expect(scheduleDateLabel('2026-02-30')).toBe('2026-02-30');
 });
 it('requires original source evidence and preserves catalog identity',()=>{
  for(const [slug,rows] of Object.entries(reviewed.universities)){
   expect(catalogUniversity(slug)).toBeDefined();
   expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
   for(const row of rows){
    expect(row.academicYear).toBe(2027);expect(row.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(row.sourceUrl).toMatch(/^https?:\/\//);expect(row.sourcePage).toBeGreaterThan(0);
    expect(row.verifiedAt).toMatch(/^2026-11-13T/);expect(row.date).toMatch(/^2026-\d{2}-\d{2}$/);
   }
  }
 });
 it('corrects announcement dates and separates campus and tracks',()=>{
  const k=universitySchedules(catalogUniversity('kookmin')!);
  expect(k.map(r=>r.date)).toEqual(['2026-12-05','2026-12-06']);
  const s=universitySchedules(catalogUniversity('skku')!);
  expect(s.find(r=>r.track==='언어논술')?.date).toBe('2026-11-21');
  const h=universitySchedules(catalogUniversity('hufs')!);
  expect(h).toHaveLength(4);expect(new Set(h.map(r=>r.date)).size).toBe(2);
  expect(universitySchedules(catalogUniversity('korea')!).filter(r=>r.campus==='세종').every(r=>r.time===null)).toBe(true);
 });
 it('preserves earlier academic years and does not infer them from current dates',()=>{
  const u=structuredClone(catalogUniversity('hufs')!);
  const old=structuredClone(u.offerings[0]);old.admissionYear=2026;
  const detail=old.admissionDetails![0];detail.facts.exam_date='2025-11-22';detail.sourceStatus='OFFICIAL_CONFIRMED';
  u.offerings.push(old);
  expect(universitySchedules(u).some(r=>r.academicYear===2026&&r.date==='2025-11-22')).toBe(true);
 });
});
describe('accessible brand buttons',()=>{
 it('covers all 42 universities with a neutral foreground above WCAG AA',()=>{
  expect(Object.keys(universityBrands)).toHaveLength(42);
  for(const brand of Object.values(universityBrands)){
   const hex=brand.primary_color;
   const c=hex.slice(1).match(/../g)!.map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
   const l=.2126*c[0]+.7152*c[1]+.0722*c[2];
   expect(brandTextColor(hex)==='#FFFFFF'?1.05/(l+.05):(l+.05)/.05).toBeGreaterThanOrEqual(4.5);
  }
  expect(brandTextColor('#EA5514')).toBe('#000000');
 });
});
