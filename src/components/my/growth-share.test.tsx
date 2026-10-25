// @vitest-environment jsdom
import {fireEvent,render,screen,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {GrowthShare} from './growth-share';
vi.mock('./owner-data',()=>({useOwnerData:()=>({data:[],error:null,reload:vi.fn()})}));
afterEach(cleanup);
it('copies only the public LAB address and closes with Escape, outside click, or close',async()=>{
 const writeText=vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 render(<GrowthShare rows={[]} selected={null}/>);
 const share=screen.getByRole('button',{name:'공유'});
 fireEvent.click(share);
 fireEvent.click(screen.getByRole('button',{name:'논술 LAB 주소 복사'}));
 expect(await screen.findByText('주소를 복사했어요.')).toBeInTheDocument();
 expect(writeText).toHaveBeenCalledWith('https://lab.legendstudy.com');
 fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(share).toHaveFocus();
 fireEvent.click(share);fireEvent.pointerDown(document.body);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 fireEvent.click(share);fireEvent.click(screen.getByRole('button',{name:'닫기'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
