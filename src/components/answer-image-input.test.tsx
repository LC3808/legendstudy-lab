// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {AnswerImageInput} from './answer-image-input';
afterEach(cleanup);
it('camera and attachment share validated Math input without uploading',()=>{
 const changed=vi.fn();render(<AnswerImageInput file={null} onChange={changed}/>);
 expect(screen.getByLabelText('답안 사진 촬영')).toHaveAttribute('capture','environment');
 fireEvent.change(screen.getByLabelText('답안 이미지 첨부'),{target:{files:[new File(['x'],'bad.svg',{type:'image/svg+xml'})]}});
 expect(changed).not.toHaveBeenCalled();expect(screen.getByRole('alert')).toBeVisible();
 const image=new File(['image'],'answer.png',{type:'image/png'});
 fireEvent.change(screen.getByLabelText('답안 이미지 첨부'),{target:{files:[image]}});expect(changed).toHaveBeenCalledWith(image);
});
it('frozen input cannot choose or remove evidence',()=>{
 render(<AnswerImageInput file={null} onChange={vi.fn()} disabled/>);
 expect(screen.getByLabelText('답안 사진 촬영')).toBeDisabled();expect(screen.getByLabelText('답안 이미지 첨부')).toBeDisabled();
});
