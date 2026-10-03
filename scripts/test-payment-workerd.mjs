/** Real workerd, synthetic outbound service only. No external provider/DB calls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const {Miniflare, convertV4MiniflareOptions} = require(process.argv[2] || 'miniflare');
const source = readFileSync(new URL('../cloudflare/payments.ts', import.meta.url),'utf8');
assert.match(source, /redirect: 'manual'/);
const script = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,'') + '\nexport default {async fetch(){try {const r=await call(fetch,"https://synthetic.invalid/",{headers:{Authorization:"Bearer synthetic-only"}});return new Response(null,{status:r.status});}catch{return new Response(null,{status:503});}}};';
for(const status of [200,400,301,302,303,304,307,308]) {
 let calls=0;
 const options={modules:true,compatibilityDate:'2026-09-22',script,outboundService:async request=>{calls++;assert.equal(request.url,'https://synthetic.invalid/');return new Response(null,{status,headers:{Location:'https://must-not-follow.invalid/'}});}};
 const mf=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
 try{const r=await mf.dispatchFetch('https://worker.invalid/');assert.equal(r.status,status>=300&&status<400?503:status);assert.equal(calls,1);console.log(`WORKERD_PAYMENT PASS status=${status} outbound=1 redirects_followed=0`);}finally{await mf.dispose();}
}
