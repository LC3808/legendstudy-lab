// @vitest-environment jsdom
import {useState} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {AnswerImagesInput} from './answer-image-input';
afterEach(()=>cleanup());
it('preserves attachment order and removes only the selected page',()=>{
 URL.createObjectURL=vi.fn(()=> 'blob:test'); URL.revokeObjectURL=vi.fn();
 function Harness(){const [files,setFiles]=useState<File[]>([]);return <AnswerImagesInput files={files} onChange={setFiles}/>;}
 render(<Harness/>);
 const first=new File(['first'],'first.png',{type:'image/png'}),second=new File(['second'],'second.png',{type:'image/png'});
 fireEvent.change(screen.getByLabelText('답안 이미지 첨부'),{target:{files:[first]}});
 fireEvent.change(screen.getAllByLabelText('답안 이미지 첨부').at(-1)!,{target:{files:[second]}});
 expect(screen.getAllByRole('group').map(e=>e.textContent)).toEqual([expect.stringContaining('first.png'),expect.stringContaining('second.png')]);
 fireEvent.click(screen.getAllByRole('button',{name:'사진 삭제'})[0]);
 expect(screen.queryByText('first.png')).toBeNull();expect(screen.getByText('second.png')).toBeVisible();
 expect(screen.getByText('사진 1/6장 · 첨부한 순서로 저장됩니다.')).toBeVisible();
});
it('disabled state blocks input and invalid files never change answers',()=>{
 const change=vi.fn();const view=render(<AnswerImagesInput files={[]} onChange={change}/>);
 fireEvent.change(screen.getByLabelText('답안 이미지 첨부'),{target:{files:[new File(['script'],'bad.svg',{type:'image/svg+xml'})]}});
 expect(change).not.toHaveBeenCalled();expect(screen.getByRole('alert')).toBeVisible();
 view.rerender(<AnswerImagesInput files={[]} onChange={change} disabled/>);
 expect(screen.getByLabelText('답안 이미지 첨부')).toBeDisabled();
});
