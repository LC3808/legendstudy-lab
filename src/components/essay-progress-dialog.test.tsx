// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {EssayProgressDialog,essayRestMessages} from './essay-progress-dialog';
afterEach(()=>{cleanup();vi.useRealTimers();});
it('shows actual completed count, never invents a percentage or completes a partial run',()=>{
 render(<EssayProgressDialog state="completed" questions={[{id:'a',label:'문제 1',state:'completed'},{id:'b',label:'문제 2',state:'processing'}]} onClose={()=>{}} onResult={()=>{}}/>);
 expect(screen.queryByText('첨삭이 완료됐어요!')).toBeNull();
 expect(screen.getByText('1 / 2')).toBeVisible();
 expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
 expect(screen.queryByRole('button',{name:'첨삭 결과 확인하기'})).toBeNull();
});
it('rotates existing rest messages every ten seconds and cleans up on close',()=>{
 vi.useFakeTimers();const close=vi.fn();const view=render(<EssayProgressDialog state="processing" onClose={close}/>);
 expect(screen.getByText(essayRestMessages[0])).toBeVisible();
 act(()=>vi.advanceTimersByTime(10000));expect(screen.getByText(essayRestMessages[1])).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'진행 화면 닫기'}));expect(close).toHaveBeenCalledOnce();
 view.unmount();expect(vi.getTimerCount()).toBe(0);
});
it('complete and failed server states expose distinct actions',()=>{
 const result=vi.fn();const view=render(<EssayProgressDialog state="completed" questions={[{id:'a',label:'문제 1',state:'completed'}]} onClose={()=>{}} onResult={result}/>);
 fireEvent.click(screen.getByRole('button',{name:'첨삭 결과 확인하기'}));expect(result).toHaveBeenCalledOnce();
 view.rerender(<EssayProgressDialog state="reserved" questions={[{id:'a',label:'문제 1',state:'failed'}]} onClose={()=>{}}/>);
 expect(screen.getByRole('heading',{name:'재처리가 필요해요'})).toBeVisible();expect(screen.queryByRole('progressbar')).toBeNull();
});
