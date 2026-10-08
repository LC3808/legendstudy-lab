/** Browser import graph + static export canary audit; prints no asset contents. */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const visited=new Set(),root=process.cwd();
// The hosted gateway must execute Functions, not fall through to static assets (405).
for (const file of ['public/_routes.json', ...(fs.existsSync('out/_routes.json') ? ['out/_routes.json'] : [])]) {
 const routes=JSON.parse(fs.readFileSync(file,'utf8'));
 const matches=(pattern,url)=>new RegExp('^'+pattern.split('*').map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$').test(url);
 for (const endpoint of ['upload','extract','evaluate']) {
  const url='/api/math/'+endpoint;
  if(routes.version!==1 || !routes.include?.some(p=>matches(p,url)) || routes.exclude?.some(p=>matches(p,url))) throw Error('MATH_FUNCTION_ROUTE_MISSING: '+file);
 }
}
function visit(file){
 if(visited.has(file))return;visited.add(file);
 const source=fs.readFileSync(file,'utf8');
 if(file.includes('/math-release/server/')||file.includes('/essay-runtime/server/')||file.includes('/quality/')||file.includes('/functions/'))throw Error('PRIVILEGED_BROWSER_IMPORT');
 if(/MATH_(?:PROVIDER_API_KEY|EXTRACTION_WORKER_JWT|EVALUATION_WORKER_JWT)/.test(source))throw Error('SECRET_BROWSER_REFERENCE');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 function walk(node){
  const spec=(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))?node.moduleSpecifier:ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword?node.arguments[0]:undefined;
  if(spec&&ts.isStringLiteral(spec)){
   const name=spec.text;
   const base=name.startsWith('@/')?path.join(root,'src',name.slice(2)):name.startsWith('.')?path.resolve(path.dirname(file),name):null;
   if(base){const target=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts'),path.join(base,'index.tsx')].find(x=>fs.existsSync(x)&&fs.statSync(x).isFile());if(target&&!target.endsWith('.css'))visit(target);}
  }ts.forEachChild(node,walk);
 }walk(ast);
}
visit(path.join(root,'src/components/math-release/student-route.tsx'));
visit(path.join(root,'src/components/essay-runtime-entry.tsx'));
if(fs.existsSync('src/app/math-render-check'))throw Error('LOCAL_FIXTURE_REMAINS');
let assets=0;
function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())scan(p);else if(/\.(?:html|js|json|txt|map)$/.test(p)){assets++;const text=fs.readFileSync(p,'utf8');if(/MATH_PRIVATE_CANARY_|MATH_PROVIDER_API_KEY|MATH_EXTRACTION_WORKER_JWT|MATH_EVALUATION_WORKER_JWT/.test(text))throw Error('PRIVILEGED_ASSET');}}}
if(fs.existsSync('out'))scan('out');
console.log(JSON.stringify({math_browser_graph:'PASS',operator_console:'ABSENT',modules:visited.size,static_assets_scanned:assets,canary:'ABSENT'}));
