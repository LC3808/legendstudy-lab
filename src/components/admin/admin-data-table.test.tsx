// @vitest-environment jsdom
import {afterEach,it,expect} from 'vitest';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {AdminDataTable} from './admin-data-table';
afterEach(()=>{cleanup();window.history.replaceState({},'','/');});
it('sorts numbers, keeps unknown last, searches and restores URL state',()=>{
 const rows=[{id:'a',name:'가',n:10},{id:'b',name:'나',n:2},{id:'c',name:'다',n:null}];
 const view=()=> <AdminDataTable id="aggregate" rows={rows} rowKey={r=>r.id} scope="집계 표" columns={[{key:'name',label:'대상',value:r=>r.name},{key:'count',label:'건수',value:r=>r.n}]}/>;
 const mounted=render(view());fireEvent.click(screen.getByRole('button',{name:'건수'}));
 expect(screen.getAllByRole('row').slice(1).map(r=>r.textContent)).toEqual(['나2','가10','다—']);
 fireEvent.click(screen.getByRole('button',{name:'건수 ↑'}));expect(screen.getAllByRole('row').slice(1).map(r=>r.textContent)).toEqual(['가10','나2','다—']);
 fireEvent.change(screen.getByLabelText('표 검색'),{target:{value:'나'}});expect(screen.getAllByRole('row')).toHaveLength(2);expect(location.search).toContain('aggregate-q=');
 mounted.unmount();render(view());expect(screen.getByLabelText('표 검색')).toHaveValue('나');fireEvent.click(screen.getByRole('button',{name:'표 초기화'}));expect(screen.getAllByRole('row')).toHaveLength(4);
});
it('paginates only returned rows and clamps invalid query pages',()=>{
 window.history.replaceState({},'','/?t-page=999');render(<AdminDataTable id="t" rows={[1,2,3]} rowKey={String} scope="반환된 행" pageSize={2} columns={[{key:'n',label:'값',value:r=>r}]}/>);expect(screen.getByText('2 / 2')).toBeInTheDocument();expect(screen.getByRole('button',{name:'표 다음'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'표 이전'}));expect(screen.getByText('1 / 2')).toBeInTheDocument();
});
