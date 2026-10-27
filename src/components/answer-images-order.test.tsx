// @vitest-environment jsdom
import {render,screen,fireEvent} from '@testing-library/react';
import {useState} from 'react';
import {it,expect,vi} from 'vitest';
import {AnswerImagesInput} from './answer-image-input';
function Harness(){const [files,setFiles]=useState(Array.from({length:6},(_,i)=>new File(['x'],`${i+1}.png`,{type:'image/png'})));return <><AnswerImagesInput files={files} onChange={setFiles}/><output>{files.map(f=>f.name).join(',')}</output></>;}
it('keeps six ordered previews, supports reorder and individual deletion',()=>{
 vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=> 'blob:fixture'),revokeObjectURL:vi.fn()}));
 render(<Harness/>);expect(screen.getAllByAltText('선택한 답안 사진')).toHaveLength(6);
 expect(screen.getAllByLabelText('사진 교체')).toHaveLength(6);
 fireEvent.click(screen.getByRole('button',{name:'사진 2 앞으로'}));expect(screen.getByRole('status')).toHaveTextContent('2.png,1.png,3.png,4.png,5.png,6.png');
 fireEvent.click(screen.getAllByText('사진 삭제')[0]);expect(screen.getByRole('status')).toHaveTextContent('1.png,3.png,4.png,5.png,6.png');
 expect(screen.getAllByAltText('선택한 답안 사진')).toHaveLength(5);
});
