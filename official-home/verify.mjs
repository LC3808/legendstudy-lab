import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const runtime = await import('./dist/ga4-runtime.js');
assert.equal(typeof runtime.createGa4Runtime, 'function');
assert(!(await readFile(path.join(root,'dist/ga4-runtime.js'),'utf8')).includes('process.env'));
const html=await readFile(path.join(root,'dist/index.html'),'utf8');
assert(!html.includes('{{'));
assert(!/<form\b/i.test(html));
assert(html.includes('src="bootstrap.js"'));
assert.equal((html.match(/id6820826957/g) ?? []).length, 2);
assert.equal((html.match(/id=com.legendstudy.app/g) ?? []).length, 2);
assert(!html.includes('출시 준비 중'));
assert(html.includes('레전드스터디+ 앱 출시'));
assert(html.includes('https://lab.legendstudy.com/refund/'));
assert(html.includes('수리논술은 준비 중'));
assert.equal((html.match(/data-destination=/g) ?? []).length, 6);
assert(html.includes('https://home.legendstudy.com/'));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
for(const [,href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
 if(href.startsWith('#')) {if(href.length>1)assert(ids.includes(href.slice(1)),href);}
 else if(!/^(https:|mailto:)/.test(href))await access(path.join(root,'dist',href));
}
for(const file of ['resources.png','timer.png','app-icon.png']) {
 const b=await readFile(path.join(root,'dist/assets',file));
 assert.equal(b.subarray(1,4).toString(),'PNG');
 console.log(file,b.readUInt32BE(16),b.readUInt32BE(20));
}
assert(html.includes('262-88-02453'));
assert(html.includes('2025-서울노원-1263'));
console.log('PASS: local assets, anchors, legal identity, launch copy, store CTAs, legal links, analytics module, no forms.');
