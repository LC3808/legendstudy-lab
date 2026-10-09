// @vitest-environment jsdom
import {render,screen,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi,afterEach} from 'vitest';
import {VoiceFeedback} from './voice-feedback';
afterEach(()=>vi.unstubAllGlobals());
it('plays only stored text using a local Korean voice, pauses/resumes/restarts and cancels on unmount',async()=>{
 const local={localService:true,lang:'ko-KR'},remote={localService:false,lang:'ko-KR'};
 const synth={getVoices:()=>[remote,local],addEventListener:vi.fn(),removeEventListener:vi.fn(),speak:vi.fn(),cancel:vi.fn(),pause:vi.fn(),resume:vi.fn()};
 vi.stubGlobal('speechSynthesis',synth);vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(public text:string){}});
 const ui=render(<VoiceFeedback text="저장된 실제 평가"/>);expect(synth.speak).not.toHaveBeenCalled();
 const u=userEvent.setup();await u.click(screen.getByRole('button',{name:'음성으로 듣기'}));
 expect(synth.speak.mock.calls[0][0]).toMatchObject({text:'저장된 실제 평가',voice:local});
 await u.click(screen.getByRole('button',{name:'일시정지'}));expect(synth.pause).toHaveBeenCalledOnce();
 await u.click(screen.getByRole('button',{name:'계속 듣기'}));expect(synth.resume).toHaveBeenCalledOnce();
 await u.click(screen.getByRole('button',{name:'다시 듣기'}));expect(synth.speak).toHaveBeenCalledTimes(2);
 act(()=>synth.speak.mock.calls[1][0].onerror());expect(screen.getByRole('status')).toHaveTextContent('재생하지 못했습니다');
 ui.unmount();expect(synth.cancel).toHaveBeenCalledTimes(3);
});
it('does not offer cloud voices or autoplay when no local Korean voice exists',()=>{
 vi.stubGlobal('speechSynthesis',{getVoices:()=>[{localService:false,lang:'ko-KR'}],addEventListener:vi.fn(),removeEventListener:vi.fn(),cancel:vi.fn()});
 render(<VoiceFeedback text="평가"/>);expect(screen.queryByRole('button',{name:'음성으로 듣기'})).toBeNull();expect(screen.getByText(/오프라인 음성이 없어/)).toBeVisible();
});
