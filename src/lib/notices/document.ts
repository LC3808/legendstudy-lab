/** Versioned allowlist, never HTML. Plain content remains the legacy APP contract. */
export type TextBlock = { type: 'text'; text: string; bold: boolean; underline: boolean; size: 16 | 18 | 22 | 28 };
export type ImageBlock = { type: 'image'; path: string; alt: string };
export type NoticeDocument = { version: 1; blocks: (TextBlock | ImageBlock)[] };
export const NOTICE_BUCKET = 'notice-media';
export const imagePath = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/;
export const textBlock = (text = ''): TextBlock => ({ type: 'text', text, bold: false, underline: false, size: 16 });
export function parseDocument(value: unknown, allowEmptyImageAlt = false): NoticeDocument | null {
  if (!value || typeof value !== 'object') return null;
  const d = value as NoticeDocument;
  if (d.version !== 1 || !Array.isArray(d.blocks) || d.blocks.length > 100 || !d.blocks.length) return null;
  let length = 0, images = 0;
  for (const b of d.blocks) {
    if (!b || typeof b !== 'object') return null;
    if (b.type === 'text') {
      if (typeof b.text !== 'string' || typeof b.bold !== 'boolean' || typeof b.underline !== 'boolean' || ![16,18,22,28].includes(b.size)) return null;
      length += b.text.length;
    } else if (b.type === 'image') {
      if (typeof b.path !== 'string' || !imagePath.test(b.path) || typeof b.alt !== 'string' || (!allowEmptyImageAlt && !b.alt.trim()) || b.alt.length > 300 || ++images > 8) return null;
    } else return null;
  }
  return length <= 45000 ? d : null;
}
export function plainContent(doc: NoticeDocument): string {
  return doc.blocks.map(b => b.type === 'text' ? b.text : `[이미지: ${b.alt}]`).join('\n\n').trim();
}
