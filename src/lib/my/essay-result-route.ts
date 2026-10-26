import type {RecordItem} from './essay-dashboard';
export function essayResultHref(source:RecordItem['source'],id:string){return `/my/essays/result/?source=${source}&id=${encodeURIComponent(id)}`;}
export function openEssayResult(source:RecordItem['source'],id:string){window.location.assign(essayResultHref(source,id));}
export function allQuestionsCompleted(state:string,questions:{state:string}[]){return state.toLowerCase()==='completed'&&questions.length>0&&questions.every(q=>q.state.toLowerCase()==='completed');}
