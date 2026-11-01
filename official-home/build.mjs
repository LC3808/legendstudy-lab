import ts from 'typescript';
import {readFile,mkdir,cp,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const config = {
  enabled: process.env.HOME_ANALYTICS_ENABLED === 'true',
  measurementId: process.env.HOME_GA4_MEASUREMENT_ID ?? '',
  origins: ['https://home.legendstudy.com'],
  privacyReviewed: process.env.HOME_GA4_PRIVACY_REVIEWED === 'true',
  pageTitle: '레전드스터디+ 공식 홈페이지',
};
if (config.enabled && (!/^G-[A-Z0-9]{6,20}$/.test(config.measurementId) || !config.privacyReviewed)) {
  throw Error('Homepage analytics requires a verified measurement ID and privacy review.');
}
const authority=await readFile(path.join(root,'../src/lib/business-info.ts'),'utf8');
const get=(key)=>{const m=authority.match(new RegExp(`${key}:\\s*"([^"]+)"`));if(!m)throw Error('Missing authority: '+key);return m[1];};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const business=`<p>${esc(get('legalName'))} · 대표 ${esc(get('representative'))}</p><p>사업자등록번호 ${esc(get('businessRegistrationNumber'))} · 통신판매업 신고번호 ${esc(get('ecommerceRegistrationNumber'))}</p><p>${esc(get('address'))}</p><p>고객지원 <a href="mailto:support@legendstudy.com">support@legendstudy.com</a> · 일반·제휴 <a href="mailto:contact@legendstudy.com">contact@legendstudy.com</a></p>`;
await rm(path.join(root,'dist'),{recursive:true,force:true});await mkdir(path.join(root,'dist'),{recursive:true});await cp(path.join(root,'site'),path.join(root,'dist'),{recursive:true});
let html=await readFile(path.join(root,'site/index.html'),'utf8');html=html.replace('{{BUSINESS_INFO}}',business);await writeFile(path.join(root,'dist/index.html'),html);
await writeFile(path.join(root,'dist/robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://home.legendstudy.com/sitemap.xml\n');
await writeFile(path.join(root,'dist/sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://home.legendstudy.com/</loc></url></urlset>');
// Reuse the LAB GA4 runtime; compile only this standalone, dependency-free module.
// No LAB environment values or secrets are copied into the homepage bundle.
const runtimeSource = (await readFile(path.join(root, '../src/lib/analytics/ga4.ts'), 'utf8'))
  .replace(/process\.env\.[A-Z0-9_]+/g, 'undefined');
await writeFile(path.join(root, 'dist/ga4-runtime.js'), ts.transpileModule(runtimeSource, {
  compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020}
}).outputText);
await writeFile(path.join(root, 'dist/analytics-config.js'), 'export const homeAnalyticsConfig = ' + JSON.stringify(config) + ';\n');
const scriptPolicy = config.enabled ? "'self' https://www.googletagmanager.com" : "'self'";
const connectPolicy = config.enabled ? "https://*.google-analytics.com https://www.googletagmanager.com" : "'none'";
await writeFile(path.join(root,'dist/_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; img-src 'self'; font-src 'self'; style-src 'self'; script-src ${scriptPolicy}; connect-src ${connectPolicy}; frame-ancestors 'none'; base-uri 'none'; form-action 'none'\n`);
console.log('Standalone official-home/dist ready; LAB output untouched.');
