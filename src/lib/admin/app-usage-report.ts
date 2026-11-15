import type {GaTable} from './ga4-report';
export const menuNames:Record<string,string>={home:'홈',materials:'자료실',study:'학습',lab:'LAB',essay:'논술',math_essay:'수리 논술',essay_history:'논술 내역',essay_growth:'논술 성장',my:'MY',bookmarks:'북마크',recent:'최근 본 자료',study_trends:'공부 추이',aspirations:'희망 대학',school:'학교',settings:'설정',feedback:'문의',notices:'공지사항',notifications:'알림',scores:'모의고사 성적',school_scores:'내신 성적'};
export const featureNames:Record<string,string>={material_search:'자료 검색 완료',pdf_view:'PDF 표시',bookmark_add:'자료 저장',bookmark_remove:'저장 취소',study_timer_start:'타이머 시작',study_timer_complete:'타이머 기록 저장',essay_lab_view:'논술 LAB 진입',essay_submit_start:'첨삭 시작'};
export type AppPlatform='all'|'ios'|'android';
export type AppUsageReport = {version:'ga4-app-usage-v1';state:'UNCONNECTED'} | {
 version:'ga4-app-usage-v1';state:'CONNECTED';propertyId:string;streamIds:string[];
 from:string;to:string;timeZone:string;fetchedAt:string;
 platform?:AppPlatform;summary?:GaTable;events?:GaTable;screens?:GaTable;menuClicks?:GaTable|null;firstObserved?:string|null;lastObserved?:string|null;observationFrom?:string;
 active:{days:1|7|30;from:string;to:string;users:number|null}[];
 menusByUsers:GaTable|null;menusByViews:GaTable|null;materials:GaTable|null;
 missingDimensions:string[];titlesUnavailable:boolean;thresholded:boolean;sampled:boolean;dataLoss:boolean;
};
