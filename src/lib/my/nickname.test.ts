import {describe,it,expect} from 'vitest';
import {nicknameLength,nicknameError} from './nickname';
describe('nickname graphemes',()=>{
 for(const char of ['가','a','👨‍👩‍👧‍👦','👍🏽','🇰🇷','e\u0301','가']){
  it(`counts ${char} as one visible character`,()=>{
   expect(nicknameLength(char.repeat(20))).toBe(20);
   expect(nicknameError(char.repeat(20))).toBeNull();
   expect(nicknameError(char.repeat(21))).not.toBeNull();
  });
 }
 it('preserves an unchanged long legacy name and rejects new long names',()=>{
  const old='가'.repeat(80);expect(nicknameError(old,old)).toBeNull();expect(nicknameError(old+'a',old)).not.toBeNull();
 });
 it('rejects control characters but permits clearing an optional name',()=>{expect(nicknameError('a\nb')).not.toBeNull();expect(nicknameError('')).toBeNull();});
});

import vectors from '../../../supabase/candidates/nickname_grapheme_20261114/unicode16-vectors.json';
import {unicode16GraphemeLength} from './unicode16-graphemes';
it('matches all official Unicode 16 grapheme boundaries',()=>{
 for(const [value,count] of vectors)expect(unicode16GraphemeLength(String(value))).toBe(count);
});
it('keeps Unicode 16 pictographic ZWJ behavior across newer Intl runtimes',()=>{
 expect(nicknameLength('✁‍✁'.repeat(20))).toBe(20);
 expect(nicknameError('✁‍✁'.repeat(20))).toBeNull();
});
