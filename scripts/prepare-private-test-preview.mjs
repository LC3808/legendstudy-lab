import { writeFileSync } from 'node:fs';
// TEST deployment artifact only. Do not alter the production routing manifest.
if (!['legendstudy-task09','legendstudy-task16b'].includes(process.env.TASK09_PREVIEW_PROJECT)) throw new Error('Exact TEST project required');
writeFileSync('out/_routes.json', JSON.stringify({ version: 1, include: ['/*'], exclude: [] }, null, 2));
