import {describe,it,expect} from 'vitest';
import {parseDocument,plainContent,textBlock} from './document';
describe('notice document allowlist',()=>{
 it('keeps old APP text readable, never inserts markup',()=>{
  const doc={version:1 as const,blocks:[{...textBlock('기존 안내'),bold:true,size:28 as const},{type:'image' as const,path:'00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.webp',alt:'출시 안내'}]};
  expect(parseDocument(doc)).toEqual(doc);expect(plainContent(doc)).toBe('기존 안내\n\n[이미지: 출시 안내]');
 });
 it.each([null,{}, {version:2,blocks:[textBlock()]}, {version:1,blocks:[{type:'html',html:'<script/>'}]}, {version:1,blocks:[{...textBlock(),size:999}]}, {version:1,blocks:[{type:'image',path:'https://evil/image.svg',alt:'a'}]}, {version:1,blocks:[textBlock('x'.repeat(45001))]}])('rejects invalid document %j',v=>expect(parseDocument(v)).toBeNull());
});

it('keeps an unfinished image description editable but refuses saving it',()=>{
 const d={version:1,blocks:[{type:'image',path:'00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.webp',alt:''}]};
 expect(parseDocument(d,true)).not.toBeNull();expect(parseDocument(d)).toBeNull();
});
