// Synthetic PG17 harness bridge only. Never accepts credentials or remote connections.
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath?.startsWith('/private/tmp/') || !outputPath?.startsWith('/private/tmp/')) throw Error('LOCAL_FIXTURE_ONLY');
const compiled = ts.transpileModule(readFileSync('src/lib/math-eval/runtime/physical-contract.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputText).toString('base64'));
const { claim, candidate } = JSON.parse(readFileSync(inputPath,'utf8'));
writeFileSync(outputPath, JSON.stringify(api.physicalFinalize(candidate,api.physicalClaimToInput(claim))));
