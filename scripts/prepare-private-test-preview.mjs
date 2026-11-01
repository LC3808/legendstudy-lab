import { writeFileSync } from 'node:fs';
// TEST deployment artifact only. Do not alter the production routing manifest.
if (process.env.TASK09_PREVIEW_PROJECT !== 'legendstudy-task09') throw new Error('Exact TEST project required');
writeFileSync('out/_routes.json', JSON.stringify({ version: 1, include: ['/*'], exclude: [] }, null, 2));
