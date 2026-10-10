import {describe,it,expect,vi,afterEach} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('node:fs/promises',()=>({readFile:vi.fn()}));
import {readFile} from 'node:fs/promises';
import {loadResearchPreview} from './server';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()});
describe('server preview',()=>{
 it('never reads files in production even when flag is set',async()=>{vi.stubEnv('NODE_ENV','production');vi.stubEnv('LEGENDSTUDY_ESSAY_PREVIEW','1');expect(await loadResearchPreview()).toBeNull();expect(readFile).not.toHaveBeenCalled()});
 it('requires deliberate local opt in',async()=>{vi.stubEnv('NODE_ENV','development');vi.stubEnv('LEGENDSTUDY_ESSAY_PREVIEW','0');expect(await loadResearchPreview()).toBeNull();expect(readFile).not.toHaveBeenCalled()});
 it('invalid preview file fails visibly instead of publishing candidates',async()=>{vi.stubEnv('NODE_ENV','development');vi.stubEnv('LEGENDSTUDY_ESSAY_PREVIEW','1');vi.mocked(readFile).mockResolvedValue('{}');await expect(loadResearchPreview()).rejects.toThrow()});
});
