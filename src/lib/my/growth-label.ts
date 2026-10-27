import labels from '@/data/essay-growth-labels.json';
/** Display aliases grounded in the stored criterion wording, never criterion position or score. */
const aliases:[RegExp,string][]=[
 [/^맞춤법과 원고지 사용법에 중대한 오류/, '맞춤법·원고지'],
 [/^문제에서 제시하고 있는 글자 수/, '글자 수 준수'],
 [/^비슷한 뜻의 문장을 반복하거나[\s\S]*자신의 언어로/, '자기 언어·표현'],
 [/^답안 작성 시 제시문을 한 문장 이상 그대로/, '제시문 인용'],
 [/^제시문 \[다\]의 관점을 정확히 파악/, '제시문 관점 이해'],
 [/^각 자료의 내용이 해당 입장을 어떻게 정당화/, '자료·입장 정당화'],
 [/^자신의 선택을 \[문제 1\]의 제시문 및/, '선택의 정당화'],
 [/^\[문제 1\]의 두 입장을 유기적으로 연결/, '입장 연결·논증'],
 [/^문제해결이 잘 이루어졌는가/, '문제 해결 충실성'],
 [/^논리 전개와 구성이 잘 이루어졌는가/, '논리·구성'],
 [/제시문 ①, ②, ③을 활용[\s\S]*해결 방안/, '제시문·해결방안'],
 [/타자 지향성.*개념과 속성/, '타자 지향성'],
 [/‘여다낌’의 개념과 성격/, '여다낌 이해'],
 [/\[가\]-\[라\][\s\S]*타자 지향성/, '타자 지향성 연계'],
 [/\[다\]-\[라\][\s\S]*여다낌/, '여다낌·인물 관계'],
 [/각 입장을 빠짐없이 정확하게 요약/, '입장 요약의 정확성'],
 [/두 입장을 통합적으로 요약/, '입장의 통합적 요약'],
 [/일탈 및 범죄의 근본 원인으로서 사회 구조/, '일탈 원인·입장'],
 [/‘옹호’의 입장을 선택한 경우/, '입장·옹호·비판'],
 [/답안이 논제의 요구사항을 충족/, '논제 요구 충족'],
 [/답안 구성이 전체적으로 논리적인가/, '논리적 구성과 전개'],
 [/답안의 언어 사용이 명확하고/, '언어 표현의 명확성'],
 [/<가>의 내용에 따라 단순 평균값/, '평균값 해석 한계'],
 [/<나>의 SAT 평균 점수 하락의 원인/, '통계 해석 타당성'],
 [/<나>의 미국 교육위원회의 해석이 오류/, '통계 오류 원인'],
 [/소문항 1-1 공식 요구:[\s\S]*레오니아/, '소비·폐기 분석'],
 [/소문항 1-2 공식 요구:[\s\S]*사회-생태계/, '사회·생태 해석'],
 [/제시문 \[가\]가 국가 경제발전의 핵심 동력/, '제도적 경제발전'],
 [/제시문 \[다\]와 \[라\]를 통해 제도적 요인/, '제도론 한계'],
 [/\[마\] ~ \[사\]에서 제시된 비제도적/, '비제도적 성장요인'],
 [/\[마\] ~ \[사\]를 통해서 비제도적/, '경제성장론 한계'],
 [/구성과\s*전개/, '구성과 전개'],[/문장과\s*표현/, '문장과 표현'],
];
export function growthLabel(name:string,criterionId?:string){
 if(criterionId && Object.hasOwn(labels,criterionId))return (labels as Record<string,{short_label:string}>)[criterionId].short_label;
 const clean=name.replace(/\s+/g,' ').trim();
 if(!clean||/비공개|내부 전용|private/i.test(clean)||/^평가\s*항목\s*\d+$/.test(clean))return '평가 기준명 확인 필요';
 const alias=aliases.find(([pattern])=>pattern.test(clean));if(alias)return alias[1];
 // Preserve real, previously unseen titles. Do not replace them with invented competency names.
 const title=clean.replace(/\(?\s*\d+(?:\.\d+)?\s*%\s*\)?/g,'').trim();
 return title.length<=12?title:'표시명 검수 대기';
}
