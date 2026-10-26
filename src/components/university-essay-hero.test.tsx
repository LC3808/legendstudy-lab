// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {UniversityEssayHero} from './university-essay-hero';
vi.mock('./university-identity',()=>({UniversityLogo:()=> <span>공식 로고</span>}));
it('uses university identity once and preserves links and schedule',()=>{
 render(<UniversityEssayHero university={{name:'인하대학교',sourceUniversityId:'inha'} as never} selectedTitle="2027학년도 인하대학교 mock 의예과" officialLink="https://admission.inha.ac.kr" officialLabel="공식 논술 자료 확인"><details><summary>2027학년도 논술 일정</summary></details></UniversityEssayHero>);
 expect(screen.getByRole('heading',{level:1}).textContent).toBe('인하대학교');
 expect(screen.getByRole('heading',{level:2}).textContent).toBe('2027학년도 모의논술 의예과');
 expect(screen.getByRole('link').getAttribute('href')).toBe('https://admission.inha.ac.kr');
 expect(screen.getByText('2027학년도 논술 일정')).toBeTruthy();
});
