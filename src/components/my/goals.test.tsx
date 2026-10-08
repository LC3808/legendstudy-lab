// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi} from 'vitest';
import {TargetEditor} from './dashboard';
const target={id:'1',university_id:'u',intended_division:'경영학과',universities:{name:'서울대학교'}};
it('shows saved target and only opens inputs on change, returning to summary on success',async()=>{
 const user=userEvent.setup();const save=vi.fn().mockResolvedValue(true);
 const view=render(<TargetEditor target={target} busy={false} save={save}/>);
 expect(screen.getByText('경영학과')).toBeInTheDocument();expect(screen.queryByRole('textbox')).toBeNull();
 await user.click(screen.getByRole('button',{name:'변경'}));
 await user.clear(screen.getByRole('textbox'));await user.type(screen.getByRole('textbox'),'경제학과');
 await user.click(screen.getByRole('button',{name:'학과 저장'}));
 expect(save).toHaveBeenCalledWith('경제학과');
 view.rerender(<TargetEditor target={{...target,intended_division:'경제학과'}} busy={false} save={save}/>);
 expect(screen.getByText('경제학과')).toBeInTheDocument();expect(screen.queryByRole('textbox')).toBeNull();
});
it('keeps editing after failed save and cancel preserves saved value',async()=>{
 const user=userEvent.setup();render(<TargetEditor target={target} busy={false} save={vi.fn().mockResolvedValue(false)}/>);
 await user.click(screen.getByRole('button',{name:'변경'}));await user.clear(screen.getByRole('textbox'));
 await user.click(screen.getByRole('button',{name:'학과 저장'}));expect(screen.getByRole('textbox')).toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'취소'}));expect(screen.getByText('경영학과')).toBeInTheDocument();
});
