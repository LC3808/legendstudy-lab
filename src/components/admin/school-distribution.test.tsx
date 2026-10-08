// @vitest-environment jsdom
import {render,screen,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {SchoolDistribution} from './school-distribution';
vi.mock('@/lib/admin/school-distribution',()=>({nameSchoolDistribution:async()=>[{id:'known',label:'진접고등학교',count:23},{id:'unknown',label:'학교명 확인 필요',count:3}]}));
it('shows known names, unresolved and unset distinctly without changing counts',async()=>{
 render(<SchoolDistribution rows={[{key:'7530932',officeCode:'J10',count:23},{key:'999',officeCode:'J10',count:3}]} unsetCount={8}/>);
 const school=await screen.findByText('진접고등학교');expect(within(school.closest('li')!).getByText('23')).toBeInTheDocument();
 expect(screen.getByText('학교명 확인 필요')).toBeInTheDocument();expect(screen.getByText('학교 미설정')).toBeInTheDocument();expect(screen.queryByText('7530932')).toBeNull();
});
