// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {AnswerImageInput,AnswerImagesInput} from './answer-image-input';
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

it('multiple photos have one add-camera control and preserve explicit ordering',()=>{
 const files=[new File(['a'],'a.png',{type:'image/png'}),new File(['b'],'b.png',{type:'image/png'})];
 const changed=vi.fn();render(<AnswerImagesInput files={files} onChange={changed}/>);
 expect(screen.getAllByRole('button',{name:'사진 1 뒤로'})).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'사진 1 뒤로'}));expect(changed).toHaveBeenCalledWith([files[1],files[0]]);
 expect(document.querySelectorAll('.answer-image-input__camera:not([hidden])')).toHaveLength(1);
 expect(files[0].name).toBe('a.png');
});
