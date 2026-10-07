/** Offline bounded scan; never reads credentials or prints matched values. */
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const files=[];function walk(p){for(const f of readdirSync(p)){const n=join(p,f);if(statSync(n).isDirectory())walk(n);else files.push(n);}}walk('out');
const selected=files.filter(p=>/\.(html|js|json|txt|map)$/.test(p));
const patterns=[/PAYMENT_FINANCE_TOKEN/,/TOSS_(?:TEST|LIVE)_SECRET_KEY/,/(?:test|live)_(?:sk|gsk)_[A-Za-z0-9_-]{12,}/,/-----BEGIN (?:EC |RSA )?PRIVATE KEY-----/,/eyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/];
const bad=selected.filter(p=>patterns.some(re=>re.test(readFileSync(p,'utf8'))));
console.log(JSON.stringify({static_secret_scan:bad.length?'FAIL':'PASS',assets:selected.length,js:selected.filter(p=>p.endsWith('.js')).length,browser_finance_token:bad.length?'UNVERIFIED':'ABSENT',browser_toss_secret:bad.length?'UNVERIFIED':'ABSENT',finding_files:bad}));if(bad.length)process.exit(1);
