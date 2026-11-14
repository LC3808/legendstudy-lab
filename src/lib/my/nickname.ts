import {unicode16GraphemeLength} from './unicode16-graphemes';
/** User-perceived characters; do not substitute UTF-16 or code-point length. */
const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' });
export function nicknameLength(value: string): number {
  const text=value.trim();
  const native=Array.from(segmenter.segment(text)).length;
  const canonical=unicode16GraphemeLength(text);
  return native===canonical?native:canonical;
}
export function nicknameError(value: string, previous?: string | null): string | null {
  if (value === previous) return null;
  const name = value.trim();
  if (nicknameLength(name) > 20 || /[\u0000-\u001f\u007f]/.test(name)) {
    return '닉네임은 이모지를 포함해 20자 이내로 입력해 주세요. 제어 문자는 사용할 수 없습니다.';
  }
  return null;
}
