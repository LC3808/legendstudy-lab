import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import routes from '../../../public/_routes.json';
it('preserves existing production OAuth/payment/Essay/Math and reviewed admin API routing',()=>{
 expect(routes.version).toBe(1);
 expect(routes.include).toEqual(['/api/auth/kakao/*','/api/payments/*','/api/math/*','/api/essay/*','/api/owner-review/essay','/api/admin/ga4']);
 expect(routes.exclude).toEqual([]);
 expect(routes.include).not.toContain('/*');
 expect(routes.include).not.toContain('/api/materials/*');
});
it('keeps existing private admin/review cache, indexing and referrer headers',()=>{
 const headers=readFileSync('public/_headers','utf8');
 expect(headers).toContain('/auth/kakao/*\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer');
 expect(headers).toContain('/admin/*\n  Cache-Control: private, no-store\n  X-Robots-Tag: noindex, nofollow');
 expect(headers).toContain('/owner-review/*\n  Cache-Control: private, no-store\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer');
});
