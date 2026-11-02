import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect,vi} from 'vitest';
const source=readFileSync('docs/analytics-phase1/promo-track-replacement.js','utf8');
function setup(win:Record<string,unknown>={}){const ctx=vm.createContext({window:win});vm.runInContext(source,ctx);return {win,send:(name:string,params={})=>{ctx.name=name;ctx.params=params;vm.runInContext('track(name,params)',ctx);}};}
describe('existing TASK15 event transport replacement',()=>{
 it('queues arguments before tag availability without loading another SDK or config',()=>{const {win,send}=setup();send('app_promo_impression',{platform:'ios',placement:'mobile_web',email:'secret'});const q=win.dataLayer as IArguments[];expect(q).toHaveLength(1);expect(Array.isArray(q[0])).toBe(false);expect(Array.from(q[0])).toEqual(['event','app_promo_impression',{send_to:'G-295EQHYTCK',platform:'ios',placement:'mobile_web'}]);});
 it('preserves four names, drops arbitrary data and deduplicates repeated callbacks',()=>{const gtag=vi.fn();const {send}=setup({gtag});for(const event of ['app_promo_impression','app_promo_click','app_promo_dismiss','app_promo_snooze']){send(event);send(event);}send('purchase');expect(gtag).toHaveBeenCalledTimes(4);});
 it('allows retry after transport throw without disrupting user action',()=>{const gtag=vi.fn().mockImplementationOnce(()=>{throw Error('blocked');});const {send}=setup({gtag});expect(()=>send('app_promo_click')).not.toThrow();send('app_promo_click');expect(gtag).toHaveBeenCalledTimes(2);});
});
