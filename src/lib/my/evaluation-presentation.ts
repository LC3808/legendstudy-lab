import {compareReports,type Report} from './evaluation-report';
export function evaluationChangeSentence(before:number,after:number){
 const delta=after-before;if(!delta)return '이전 첨삭과 동일한 평가 수준을 유지했습니다.';
 return `이전 첨삭보다 평가 수준이 ${['','한','두','세','네'][Math.abs(delta)]} 단계 ${delta>0?'높아졌습니다':'낮아졌습니다'}.`;
}
export function evaluationSpeech(report:Report,before?:Report,comparisonOnly=false){
 if(comparisonOnly){const changes=before?compareReports(before,report):null;return changes?['최초 첨삭과 재첨삭 비교.',...[...changes].sort((a,b)=>Number(a.direction==='UNCHANGED')-Number(b.direction==='UNCHANGED')).map(c=>c.before.stars===null||c.after.stars===null?`${criterionTitle(c.name)}. 평가 단계 정보가 없어 비교할 수 없습니다.`:`${criterionTitle(c.name)} 항목은 이전 ${c.before.stars}단계에서 이번 ${c.after.stars}단계로 ${c.after.stars>c.before.stars?'상승했습니다':c.after.stars<c.before.stars?'하락했습니다':'유지됐습니다'}. 5단계 기준입니다.`)].join('\n'):'';}
 const seen=new Set<string>();
 const section=(title:string,lines:string[])=>{const content=lines.filter(s=>s.trim()&&!seen.has(s.trim())&&(seen.add(s.trim()),true));return content.length?[title+'.',...content].join('\n'):'';};
 return [section('종합 평가',[report.summary]),section('잘한 점',report.strengths.map(f=>`${f.title}. ${f.explanation}`)),section('평가 기준별 결과',report.rubric.map(c=>`${criterionTitle(c.name)}. ${c.stars===null?'':`5단계 평가 중 ${c.stars}단계입니다.`} ${c.feedback}`)),section('문장 다듬기',(report.sentences??[]).flatMap(s=>[`학생이 작성한 글. ${s.quote}`,`평가. ${s.diagnosis}`,`수정 방향 안내. ${s.direction}`])),section('보완할 점',report.weaknesses.map(f=>`${f.title}. ${f.explanation}`)),section('우선 수정할 부분',report.actions),section('재작성 안내',report.nextSteps)].filter(Boolean).join('\n');
}

export function criterionTitle(value:string){
 const text=value.replace(/\(?\s*\d+(?:\.\d+)?\s*%\s*\)?/g,'').replace(/\s+/g,' ').trim();const compact=Array.from(text).slice(0,35).join('').replaceAll(' ','');
 for(const [key,title] of [['구성과전개','구성과 전개'],['사회계약론','사회계약론 이해'],['공리주의','공리주의 이해와 평가'],['미래세대','미래 세대의 도덕적 의무'],['문장과표현','문장과 표현']])if(compact.includes(key))return title;
 return Array.from(text).length>38?Array.from(text).slice(0,38).join('')+'…':text;
}
