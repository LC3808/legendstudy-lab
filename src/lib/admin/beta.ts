export type BetaConfig={beta_enabled:boolean;beta_start_at:string;beta_end_at:string;daily_free_limit:number;next_daily_limit:number|null;limit_effective_at:string|null;version:number};
export function kstInput(value:string){return new Date(Date.parse(value)+9*3600000).toISOString().slice(0,16);}
export function betaInput(form:FormData){
 const start=String(form.get('start')??'');const end=String(form.get('end')??'');const limit=Number(form.get('limit'));
 const application=String(form.get('application'));
 const a=Date.parse(start+'+09:00'),b=Date.parse(end+'+09:00');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(end)||!Number.isFinite(a)||!Number.isFinite(b)||a>=b||!Number.isInteger(limit)||limit<1||limit>100||!['immediate','next_reset'].includes(application)) throw Error('시작·종료 시각과 무료 횟수를 확인해 주세요.');
 return {beta_enabled:form.get('enabled')==='on',beta_start_at:new Date(a).toISOString(),beta_end_at:new Date(b).toISOString(),daily_free_limit:limit,reset_timezone:'Asia/Seoul',limit_application:application};
}
