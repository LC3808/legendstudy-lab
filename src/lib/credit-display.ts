/** Presentation only. Never rewrites canonical Ledger codes, reasons or amounts. */
const grantTypes: Readonly<Record<string,string>> = {
 signup_bonus:'신규가입 무료', signup_bonus_v1:'신규가입 무료',
 admin_grant:'관리자 지급', manual_support:'관리자 지급',
 promotion:'이벤트 지급', compensation:'이용 보상', purchase:'Credit 구매', refund:'환불',
 b2b_program:'학교 단체 지급', reserve:'예약', consume:'논술 첨삭 사용',
 release:'예약 해제', expiration:'만료', adjustment:'정정',
};
const actors: Readonly<Record<string,string>> = {
 system:'자동 지급', operator:'관리자', school_admin:'학교 관리자',
 promotion_system:'이벤트 자동 지급',
};
const reasons: Readonly<Record<string,string>> = {
 manual_support:'관리자 지급', test_account:'테스트 계정 지급',
 operational_promotion:'이벤트 지급', customer_compensation:'이용 보상',
 program_allocation:'학교 단체 지급', promotion:'이벤트 지급', compensation:'이용 보상',
 purchase:'Credit 구매', refund:'환불',
};
export function formatCreditGrantType(code:string|null|undefined):string {
 return code ? lookup(grantTypes,code,'기타 Credit 내역') : '구분 미제공';
}
export function formatCreditReason(raw:string|null|undefined,quantity?:number):string {
 if(!raw?.trim())return '사유 미제공';
 const reason=raw.trim();
 if(['signup_bonus_v1','signup_bonus','signup'].includes(reason)) {
  return typeof quantity==='number'&&Number.isInteger(quantity)&&quantity>0 ? `가입 축하 Credit ${quantity.toLocaleString('ko-KR')}개` : '가입 축하 Credit';
 }
 if(reason.startsWith('manual_support:'))return reason.slice('manual_support:'.length).trim()||'관리자 지급';
 // Unknown free-text reasons must remain faithful to what was recorded.
 return lookup(reasons,reason,reason);
}
export function formatCreditActor(raw:string|null|undefined):string {
 if(!raw?.trim())return '주체 미제공';
 // Support both the Admin actor_kind and the canonical actor_reference. Never display a UID.
 return lookup(actors,raw.trim().split('/')[0],'기타 주체');
}

function lookup(map:Readonly<Record<string,string>>,key:string,fallback:string):string {
 return Object.hasOwn(map,key)?map[key]:fallback;
}
