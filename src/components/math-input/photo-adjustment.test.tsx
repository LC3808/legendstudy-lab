// @vitest-environment jsdom
import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {PhotoAdjustment,validFrame,adjustPhoto} from './photo-adjustment';
it('rejects empty, non-finite and out-of-bounds crops before decoding a photo',async()=>{
 for(const frame of [{turns:0,left:80,top:0,width:30,height:100},{turns:0,left:0,top:0,width:0,height:100},{turns:0,left:NaN,top:0,width:100,height:100}]){
  expect(validFrame(frame)).toBe(false);
  await expect(adjustPhoto(new File(['original'],'answer.png'),frame)).rejects.toThrow('INVALID_FRAME');
 }
 expect(validFrame({turns:1,left:0,top:10,width:100,height:90})).toBe(true);
});
it('cancel preserves the selected original and requires explicit apply',()=>{
 const change=vi.fn();render(<PhotoAdjustment file={new File(['original'],'answer.png')} onChange={change} disabled={false}/>);
 fireEvent.click(screen.getByText('사진 보정·정렬'));
 fireEvent.click(screen.getByText('오른쪽으로 90° 회전'));
 fireEvent.click(screen.getByText('취소'));
 expect(change).not.toHaveBeenCalled();
 expect(screen.queryByRole('dialog')).toBeNull();
});
