// @vitest-environment jsdom

import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {useState} from 'react';
import {MaterialExamList} from './material-exam-list';
import {AuthorizedConsole} from './materials-console';
import {checks,type ExamRow,type Detail} from '@/lib/materials/contract';
import type {materialsClient} from '@/lib/materials/client';
vi.mock('@/lib/essay-runtime/public-discovery',()=>({publicCatalog:{universities:[{universityId:'h',sourceUniversityId:'hanyang'},{universityId:'c',sourceUniversityId:'chungang'}]}}));
vi.mock('@/lib/essay-runtime/catalog-policy',()=>({priorityUniversityIds:['chungang','hanyang']}));
vi.mock('./pdf-viewer',()=>({MaterialPdfViewer:()=>null}));
const row=(id:string,universityId:string,year:number,state='UNANALYZED'):ExamRow=>({examId:id,universityId,university:universityId==='h'?'한양대학교':'중앙대학교',year,kind:'admission',track:'인문',title:`${universityId==='h'?'한양대학교':'중앙대학교'} · ${year} · admission · 인문 · 오후 2`,questionCount:1,state,revision:0,updatedAt:null,approvalRequested:false});
const rows=[row('old','h',2024),row('new','h',2026,'VERIFIED'),row('c','c',2025)];
afterEach(cleanup);
function Harness(){const [university,setUniversity]=useState('');return <MaterialExamList rows={rows} university={university} onUniversity={setUniversity} onSelect={()=>{}}/>;}
describe('university review workflow',()=>{
 it('orders university tabs by Owner policy and scopes newest-first rows without changing total counts',()=>{
  render(<Harness/>);const nav=screen.getByRole('navigation');expect(within(nav).getAllByRole('button').map(b=>b.textContent)).toEqual(['전체1/3','중앙대학교0/1','한양대학교1/2']);
  fireEvent.click(within(nav).getByRole('button',{name:'한양대학교 1/2'}));
  const table=screen.getByRole('table');expect(within(table).getAllByRole('row')[1].textContent).toContain('2026');expect(within(table).getAllByRole('row')).toHaveLength(3);
  fireEvent.change(screen.getByLabelText('대학·계열·회차 검색'),{target:{value:'2024'}});expect(within(table).getAllByRole('row')).toHaveLength(2);expect(within(nav).getByRole('button',{name:'한양대학교 1/2'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'필터 초기화'}));expect(within(table).getAllByRole('row')).toHaveLength(3);
 });
 it('returns to the reviewed university and updates counts from successful server save; preserves filters',async()=>{
  const detail:Detail={examId:'old',questions:[],documents:[],history:[],review:{revision:0,state:'IN_REVIEW',approvalRequested:false,body:{documents:[],mappings:[{questionId:"q",sourceHash:"a".repeat(64),role:"question",startPage:1,endPage:1,verification:"VERIFIED"}],checks:Object.fromEntries(Object.keys(checks).map(k=>[k,true]))}}};
  const saved:Detail={...detail,review:{...detail.review,revision:1,state:'VERIFIED'}};
  const client={allowed:async()=>true,list:async()=>rows,documents:async()=>[],detail:async()=>detail,save:vi.fn(async()=>saved)} as unknown as ReturnType<typeof materialsClient>;
  render(<AuthorizedConsole client={client} owner="test"/>);
  await screen.findByRole('table');fireEvent.change(screen.getByLabelText('대학·계열·회차 검색'),{target:{value:'2024'}});
  fireEvent.click(within(screen.getByRole('table')).getByRole('button',{name:/검수하기/}));
  fireEvent.click(await screen.findByRole('button',{name:'검수 완료'}));
  await screen.findByText('검수 완료 상태를 저장했습니다.');
  expect(screen.getByRole('button',{name:'한양대학교 2/2'}).getAttribute('aria-pressed')).toBe('true');expect((screen.getByLabelText('대학·계열·회차 검색') as HTMLInputElement).value).toBe('2024');expect(within(screen.getByRole('table')).getByText('검수 완료')).toBeTruthy();
 });
});
