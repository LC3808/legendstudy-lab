// One-time display-only projection. Input is a private read-only criteria export.
// Never copies official source text into the public bundle or changes server criteria.
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('src/lib/my/growth-label.ts','utf8').replace(/^import .*;\n/gm,'').replace(/ if\(criterionId.*\n/,'');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {growthLabel}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),labels={};
for(const row of input){if(!row.id||!row.label)continue;const label=growthLabel(row.label);labels[row.id]={short_label:label,review_required:label==='표시명 검수 대기'||label==='평가 기준명 확인 필요'};}
fs.writeFileSync('src/data/essay-growth-labels.json',JSON.stringify(labels,null,2)+'\n');
console.log({criteria:Object.keys(labels).length,reviewPending:Object.values(labels).filter(x=>x.review_required).length});
