/** Read contract only. Credentials and arbitrary report queries never reach the client. */
export const promoEvents = ['app_promo_impression','app_promo_click','app_promo_dismiss','app_promo_snooze'] as const;
export type GaTable = {columns:string[]; rows:{label:string;values:number[]}[]; totalRows:number; limited:boolean};
export type GaReport = {
 version:'ga4-report-v1'; source:'GA4'; propertyId:string; streamId:string;
 startDate:string; endDate:string; timeZone:string; fetchedAt:string;
 summary:GaTable; returning:GaTable; daily:GaTable; channels:GaTable; pages:GaTable; events:GaTable;
 thresholded:boolean; sampled:boolean; dataLoss:boolean;
};
export const gaErrors:Record<string,string> = {
 NOT_CONFIGURED:'NOT_CONFIGURED · GA4 보고서 데이터 연결이 필요합니다. 서버 인증 설정이 없습니다.',
 LOGIN_REQUIRED:'로그인이 필요합니다.', ADMIN_REQUIRED:'접근 권한 없음 · 관리자만 조회할 수 있습니다.',
 AUTH_UNAVAILABLE:'연결 오류 · 관리자 권한을 확인하지 못했습니다.',
 PERMISSION_REQUIRED:'PERMISSION_REQUIRED · GA4 속성의 서버 읽기 권한을 확인해 주세요.',
 API_DISABLED:'NOT_CONFIGURED · Google Analytics Data API 활성화가 필요합니다.',
 TOKEN_UNAVAILABLE:'연결 오류 · Google 서버 인증에 실패했습니다.',
 RATE_LIMITED:'연결 오류 · GA4 조회 한도에 도달했습니다. 잠시 후 다시 조회해 주세요.',
 INVALID_REQUEST:'올바른 조회 기간을 선택해 주세요.',
 READ_UNAVAILABLE:'연결 오류 · GA4 보고서를 조회하지 못했습니다. 이용자가 0명이라는 뜻이 아닙니다.',
 INVALID_RESPONSE:'연결 오류 · GA4 응답 형식을 확인할 수 없습니다.',
};
export function gaErrorMessage(code:unknown){return gaErrors[String(code)]||gaErrors.READ_UNAVAILABLE;}
/** Existing KST inclusive/exclusive window -> GA inclusive calendar dates. */
export function gaDates(window:{p_from:string;p_to:string}){
 return {from:new Date(Date.parse(window.p_from)+9*3600000).toISOString().slice(0,10),
 to:new Date(Date.parse(window.p_to)-1+9*3600000).toISOString().slice(0,10)};
}
