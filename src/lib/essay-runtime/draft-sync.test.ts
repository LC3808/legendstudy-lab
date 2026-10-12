import {it,expect} from 'vitest';
import {SourceDraftSync} from './draft-sync';
import {EssayRuntimeError} from './client';
it('restores a server draft to an empty device and saves with server CAS revision',async()=>{
 const calls:unknown[]=[];
 const sync=new SourceDraftSync({open:async()=>({body:'WEB에서 작성',revision:8}),save:async(body,revision)=>{calls.push([body,revision]);return {body,revision:revision+1};}});
 expect(await sync.open('')).toEqual({body:'WEB에서 작성',conflict:false});
 await sync.save('APP에서 수정');expect(calls).toEqual([['APP에서 수정',8]]);
});
it('different nonempty drafts never overwrite either copy',async()=>{
 let writes=0;
 const sync=new SourceDraftSync({open:async()=>({body:'서버 답안',revision:2}),save:async()=>{writes++;return {body:'',revision:3};}});
 expect(await sync.open('기기의 답안')).toEqual({body:'기기의 답안',conflict:true});
 await expect(sync.save('기기의 답안')).rejects.toThrow('DRAFT_CONFLICT');expect(writes).toBe(0);expect(sync.remoteBody).toBe('서버 답안');
});
it('stale save and oversized local answer do not truncate or overwrite',async()=>{
 const sync=new SourceDraftSync({open:async()=>({body:'',revision:1}),save:async()=>{throw new EssayRuntimeError('PT409');}});
 await sync.open('local');await expect(sync.save('x'.repeat(20001))).rejects.toThrow('DRAFT_TOO_LONG');
 await expect(sync.save('local')).rejects.toThrow('PT409');expect(sync.conflict).toBe(true);
});
