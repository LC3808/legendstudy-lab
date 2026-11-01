// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {EssayFeedbackForm,feedbackReference,feedbackThanks} from './essay-feedback';
describe('LAB feedback',()=>{
 it('submits satisfaction without message and reuses retry key',async()=>{
 const submit=vi.fn().mockRejectedValueOnce(Error()).mockResolvedValueOnce(undefined);
 render(<EssayFeedbackForm submit={submit}/>);
 fireEvent.click(screen.getByLabelText('도움이 되었어요'));
 fireEvent.click(screen.getByText('제출하기'));await screen.findByRole('alert');
 fireEvent.click(screen.getByText('제출하기'));await screen.findByText(feedbackThanks);
 expect(submit.mock.calls[0][0]).toEqual(submit.mock.calls[1][0]);
 expect(submit.mock.calls[0][0].message).toBe('');expect(submit.mock.calls[0][0]).not.toHaveProperty('answer');
 });
 it('requires bug type and explanation, guards rapid double click',async()=>{
 const submit=vi.fn().mockResolvedValue(undefined);render(<EssayFeedbackForm bugOnly submit={submit}/>);
 fireEvent.click(screen.getByText('제출하기'));expect(submit).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('오류 유형'),{target:{value:'ocr'}});fireEvent.change(screen.getByLabelText('오류 설명'),{target:{value:'인식이 멈췄어요'}});
 fireEvent.click(screen.getByText('제출하기'));await waitFor(()=>expect(submit).toHaveBeenCalledTimes(1));
 });
 it('rejects non-reference text',()=>expect(feedbackReference('private answer')).toBeUndefined());
});

it('numeric satisfaction is opt-in, preserves retry and does not invent binary rating',async()=>{
 const submit=vi.fn().mockRejectedValueOnce(Error()).mockResolvedValueOnce(undefined);
 render(<EssayFeedbackForm numeric submit={submit}/>);
 fireEvent.click(screen.getByText('제출하기'));expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByLabelText('2점'));fireEvent.click(screen.getByLabelText('추상적인 피드백'));
 fireEvent.click(screen.getByText('제출하기'));await screen.findByText(/접수를 확인하지 못했어요/);
 fireEvent.click(screen.getByText('제출하기'));await screen.findByText(feedbackThanks);
 expect(submit.mock.calls[0][0]).toEqual(submit.mock.calls[1][0]);
 expect(submit.mock.calls[0][0]).toMatchObject({rating:2,negative_reasons:['abstract'],positive_reasons:[],message:''});
 expect(submit.mock.calls[0][0]).not.toHaveProperty('satisfaction');
});
