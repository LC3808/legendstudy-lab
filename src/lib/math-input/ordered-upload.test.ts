// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {uploadOrderedPages,type UploadPage} from './ordered-upload';
const pages=(n:number):UploadPage[]=>Array.from({length:n},(_,i)=>({file:new File(['x'],`${i}.png`,{type:'image/png'})}));
const port=()=>({assertOwner:vi.fn().mockResolvedValue(undefined),register:vi.fn(async(p:number)=>`artifact-${p}`),upload:vi.fn().mockResolvedValue(undefined)});
it('preserves six-page order and retries only failed/unstarted pages with same artifact',async()=>{
 const p=pages(6),t=port();t.upload.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error('network'));
 await expect(uploadOrderedPages(p,t)).rejects.toThrow('network');expect(p[0].present).toBe(true);expect(p[1].artifactId).toBe('artifact-2');
 await uploadOrderedPages(p,t);expect(t.register.mock.calls.map(x=>x[0])).toEqual([1,2,3,4,5,6]);expect(t.upload.mock.calls.map(x=>x[0])).toEqual(['artifact-1','artifact-2','artifact-2','artifact-3','artifact-4','artifact-5','artifact-6']);
});
it('rejects zero/seven pages before any remote work',async()=>{for(const n of [0,7]){const t=port();await expect(uploadOrderedPages(pages(n),t)).rejects.toThrow('INVALID_IMAGES');expect(t.register).not.toHaveBeenCalled();}});
it('stops when account ownership changes',async()=>{const t=port();t.assertOwner.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error('ACCOUNT_CHANGED'));await expect(uploadOrderedPages(pages(1),t)).rejects.toThrow('ACCOUNT_CHANGED');expect(t.upload).not.toHaveBeenCalled();});
