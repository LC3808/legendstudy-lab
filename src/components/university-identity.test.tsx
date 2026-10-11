// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {it,expect} from 'vitest';
import {UniversityLogo,UniversityRegions,regionLabels} from './university-identity';
import {catalogUniversity,publicCatalog} from '@/lib/essay-runtime/public-discovery';
import assets from '@/data/university-logos.json';
it('uses only source-region evidence and preserves multi-campus regions',()=>{
 expect(regionLabels(catalogUniversity('knu')!.offerings)).toEqual(['대구·경북']);
 expect(regionLabels(catalogUniversity('pnu')!.offerings)).toEqual(['부산·경남']);
 expect(regionLabels(catalogUniversity('korea')!.offerings)).toEqual(expect.arrayContaining(['서울','세종']));
 render(<UniversityRegions offerings={catalogUniversity('korea')!.offerings}/>);
 expect(screen.getByText('서울')).toBeVisible();expect(screen.getByText('세종')).toBeVisible();
});
it('renders a sourced original logo and keeps missing assets explicitly marked',()=>{
 render(<UniversityLogo university={catalogUniversity('gachon')!}/>);
 expect(screen.getByRole('img',{name:'가천대학교 로고'})).toHaveAttribute('src',expect.stringContaining('/university-logos/'));
 const missing={...catalogUniversity('gachon')!,sourceUniversityId:'not-in-manifest'};
 render(<UniversityLogo university={missing}/>);expect(screen.getByLabelText('가천대학교 로고 준비 중')).toBeVisible();
});
it('records official-source provenance for each logo without changing university identities',()=>{
 for(const [id,a] of Object.entries(assets)){
  expect(publicCatalog.universities.some(u=>u.sourceUniversityId===id)).toBe(true);
  expect(new URL(a.sourcePage).hostname).toMatch(/\.(ac\.kr|edu)$/);
  expect(a.sha256).toMatch(/^[a-f0-9]{64}$/);expect(a.src).toMatch(/^\/university-logos\//);
 }
});
