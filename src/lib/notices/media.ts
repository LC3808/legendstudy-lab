import type { SupabaseClient } from '@supabase/supabase-js';
import { NOTICE_BUCKET } from './document';
/** Re-encode raster images: remove metadata and reject SVG/HTML; no external URL ingestion. */
export async function prepareNoticeImage(file: File): Promise<Blob> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size)
    throw new Error('JPG·PNG·WebP 이미지를 5MB 이하로 선택해 주세요.');
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40000000)
      throw new Error('이미지 크기는 4천만 화소 이하로 선택해 주세요.');
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이미지 변환을 지원하지 않는 브라우저입니다.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('이미지 변환 실패')), 'image/webp', .85));
    if (blob.type !== 'image/webp' || blob.size > 5 * 1024 * 1024) throw new Error('이미지를 변환하지 못했습니다.');
    return blob;
  } finally { bitmap.close(); }
}
export async function uploadNoticeImage(client: SupabaseClient, userId: string, file: File): Promise<string> {
  const blob = await prepareNoticeImage(file);
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await client.storage.from(NOTICE_BUCKET).upload(path, blob, { contentType:'image/webp', upsert:false });
  if (error) throw new Error('이미지를 업로드하지 못했습니다. 관리자 권한과 첨부 설정을 확인해 주세요.');
  return path;
}
