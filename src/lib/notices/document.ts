/** Versioned allowlist, never HTML. Plain content remains the legacy APP contract. */
export type TextBlock = { type: 'text'; text: string; bold: boolean; underline: boolean; size: 16 | 18 | 22 | 28 };
export type ImageBlock = { type: 'image'; path: string; alt: string };
export type LegacyDocument = { version: 1; blocks: (TextBlock | ImageBlock)[] };
export const NOTICE_BUCKET = 'notice-media';
export const imagePath = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/;
export const textBlock = (text = ''): TextBlock => ({ type: 'text', text, bold: false, underline: false, size: 16 });
export function parseDocument(value: unknown, allowEmptyImageAlt = false): NoticeDocument | null {
  if (!value || typeof value !== 'object') return null;
  const rich = value as RichDocument;
  if (rich.version === 2) return validRich(rich) ? rich : null;
  const d = value as LegacyDocument;
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
  return doc.blocks.map(b => b.type === 'text' ? b.text : doc.version === 1 ? `[이미지: ${b.alt}]` : `\n[이미지: ${b.alt}]\n`).join(doc.version === 1 ? '\n\n' : '').trim();
}

export type Attributes = Record<string, string | number | boolean>;
export type RichText = { type: 'text'; text: string; attributes?: Attributes };
export type RichDocument = { version: 2; blocks: (RichText | ImageBlock)[] };
export type NoticeDocument = LegacyDocument | RichDocument;
export const sizes = ['12px','14px','16px','18px','22px','28px','36px'];
export function allowedAttribute(key: string, value: unknown) {
  switch (key) {
    case 'bold': case 'italic': case 'underline': case 'strike': case 'blockquote': return value === true;
    case 'size': return sizes.includes(String(value));
    case 'color': case 'background': return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
    case 'header': return value === 1 || value === 2;
    case 'list': return value === 'ordered' || value === 'bullet';
    case 'link': return typeof value === 'string' && value.length <= 2048 && /^https?:\/\/[^\s]+$/i.test(value);
    case 'align': return ['right','center','justify'].includes(String(value));
    case 'indent': return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 8;
    default: return false;
  }
}
function validRich(d: RichDocument) {
  if (!Array.isArray(d.blocks) || !d.blocks.length || d.blocks.length > 5000) return false;
  let length = 0, images = 0;
  for (const b of d.blocks) {
    if (!b || typeof b !== 'object') return false;
    if (b.type === 'text' && typeof b.text === 'string') {
      length += b.text.length;
      if (Object.keys(b).some(key => !['type','text','attributes'].includes(key))) return false;
      if (b.attributes !== undefined && (!b.attributes || typeof b.attributes !== 'object' || Array.isArray(b.attributes) ||
        !Object.entries(b.attributes).every(([key,value]) => allowedAttribute(key,value)))) return false;
    } else if (b.type === 'image' && typeof b.path === 'string' && imagePath.test(b.path) && typeof b.alt === 'string' && b.alt.trim() && b.alt.length <= 300) {
      if (++images > 8) return false;
    } else return false;
  }
  return length <= 50000 && plainContent(d).length <= 50000;
}
export function toRich(content: string, doc?: NoticeDocument | null): RichDocument {
  if (doc?.version === 2) return doc;
  if (!doc) return {version:2, blocks:[{type:'text',text:content+'\n'}]};
  const blocks: RichDocument['blocks'] = [];
  for (const b of doc.blocks) {
    if (b.type === 'image') blocks.push(b);
    else {
      const attributes: Attributes = {size: b.size+'px'};
      if (b.bold) attributes.bold = true;
      if (b.underline) attributes.underline = true;
      blocks.push({type:'text',text:b.text,attributes}, {type:'text',text:'\n'});
    }
  }
  return {version:2,blocks};
}
