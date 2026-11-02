// Read-only GA4 receipt audit. Credentials are read in memory, never printed or persisted.
import {readFile} from 'node:fs/promises';
import {createSign} from 'node:crypto';
const [keyPath, start = '2026-11-02', end = 'today'] = process.argv.slice(2);
if (!keyPath) throw Error('Usage: node audit-ga4-events.mjs /private/service-account.json [start] [end]');
const key = JSON.parse(await readFile(keyPath, 'utf8'));
if (key.client_email !== 'legendstudy-ga4-reader@legendstudy.iam.gserviceaccount.com') throw Error('Unexpected service account');
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now()/1000);
const unsigned = encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:key.client_email,scope:'https://www.googleapis.com/auth/analytics.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+300});
const assertion = unsigned+'.'+createSign('RSA-SHA256').update(unsigned).sign(key.private_key,'base64url');
const tokenResponse = await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});
if (!tokenResponse.ok) throw Error('Google authentication failed: '+tokenResponse.status);
const {access_token} = await tokenResponse.json();
const events = ['page_view','app_promo_impression','app_promo_click','app_promo_dismiss','app_promo_snooze','banner_click','sign_up','login','essay_lab_view','essay_submit_start','essay_completed','credit_purchase_start','credit_purchase_success'];
const realtime = process.argv.includes('--realtime');
const response = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/396674471:'+(realtime?'runRealtimeReport':'runReport'),{method:'POST',redirect:'manual',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify(realtime?{dimensions:[{name:'streamId'},{name:'eventName'}],metrics:[{name:'eventCount'}],limit:1000}:{dateRanges:[{startDate:start,endDate:end}],dimensions:[{name:'streamId'},{name:'eventName'}],metrics:[{name:'eventCount'}],dimensionFilter:{andGroup:{expressions:[{filter:{fieldName:'streamId',inListFilter:{values:['5829568136','16254992877','16255062112']}}},{filter:{fieldName:'eventName',inListFilter:{values:events}}}]}},limit:1000}),signal:AbortSignal.timeout(20000)});
if (!response.ok) {const error=await response.json();throw Error('Report query failed: '+response.status+' '+String(error.error?.message??'').slice(0,400));}
const report = await response.json();
console.log(JSON.stringify({fetchedAt:new Date().toISOString(),property:'396674471',period:realtime?{lastMinutes:30}:{start,end},timeZone:report.metadata?.timeZone,metadata:report.metadata,rows:(report.rows??[]).map(r=>({stream:r.dimensionValues[0].value,event:r.dimensionValues[1].value,count:Number(r.metricValues[0].value)})),note:'Absent rows mean not reported in this interval, not proof of zero receipt. Reporting latency applies.'},null,2));
