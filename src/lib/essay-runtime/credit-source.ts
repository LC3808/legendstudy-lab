/** Server-selected grant consent. Balances are explanatory, never allocation authority. */
export type CreditSource={version:'essay-credit-source-v1';grant_id:string|null;source:string;beta:number;signup_bonus:number;purchase:number;other:number};
export const creditSourceLabels:Record<string,string>={beta:'일일 베타 Credit',signup_bonus:'신규가입 무료 Credit',purchase:'유료 Credit',admin_grant:'관리자 지급 Credit',promotion:'프로모션 Credit',compensation:'보상 Credit',b2b_program:'학교 지급 Credit',included:'무료 재첨삭'};
export function parseCreditSource(value:unknown,credits:number):CreditSource{
 const s=value as CreditSource;
 if(!s||s.version!=='essay-credit-source-v1'||!Object.hasOwn(creditSourceLabels,s.source)||
 ['beta','signup_bonus','purchase','other'].some(k=>!Number.isSafeInteger(s[k as keyof CreditSource])||Number(s[k as keyof CreditSource])<0)||
 (credits===0?(s.source!=='included'||s.grant_id!==null):(credits!==1||s.source==='included'||typeof s.grant_id!=='string'||!/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(s.grant_id))))throw Error('QUOTE_UNAVAILABLE');
 return s;
}
