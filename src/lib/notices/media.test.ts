// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {prepareNoticeImage,uploadNoticeImage} from './media';
import type {SupabaseClient} from '@supabase/supabase-js';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('notice image safety',()=>{
 it.each(['image/svg+xml','text/html','application/pdf'])('rejects %s before decoding',async type=>{
  const decoder=vi.fn();vi.stubGlobal('createImageBitmap',decoder);
  await expect(prepareNoticeImage(new File(['x'],'x',{type}))).rejects.toThrow('5MB');expect(decoder).not.toHaveBeenCalled();
 });
 it('rejects oversized raster without upload',async()=>{
  await expect(prepareNoticeImage(new File([new Uint8Array(5242881)],'big.png',{type:'image/png'}))).rejects.toThrow('5MB');
 });
 it('closes decoded huge image and rejects decompression dimensions',async()=>{
  const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:10000,height:10000,close}));
  await expect(prepareNoticeImage(new File(['x'],'a.png',{type:'image/png'}))).rejects.toThrow('화소');expect(close).toHaveBeenCalled();
 });
 it('uploads reencoded WebP under UUID, never overwrites existing image',async()=>{
  const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:200,height:100,close}));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(cb=>cb(new Blob(['encoded'],{type:'image/webp'})));
  const upload=vi.fn().mockResolvedValue({error:null}),from=vi.fn().mockReturnValue({upload});
  const path=await uploadNoticeImage({storage:{from}} as unknown as SupabaseClient,'00000000-0000-0000-0000-000000000001',new File(['raw EXIF'],'original.jpg',{type:'image/jpeg'}));
  expect(path).toMatch(/^00000000-0000-0000-0000-000000000001\/[a-f0-9-]+\.webp$/);expect(from).toHaveBeenCalledWith('notice-media');expect(upload).toHaveBeenCalledWith(path,expect.any(Blob),{contentType:'image/webp',upsert:false});expect(close).toHaveBeenCalled();
 });
});
