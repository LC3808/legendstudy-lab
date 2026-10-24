/** Display aliases grounded in the stored criterion wording, never criterion position or score. */
const aliases:[RegExp,string][]=[
 [/각 입장을 빠짐없이 정확하게 요약/, '입장 요약의 정확성'],
 [/두 입장을 통합적으로 요약/, '입장의 통합적 요약'],
 [/일탈 및 범죄의 근본 원인으로서 사회 구조/, '일탈 원인에 따른 입장 분류'],
 [/‘옹호’의 입장을 선택한 경우/, '입장 이해와 옹호·비판의 타당성'],
 [/답안이 논제의 요구사항을 충족/, '논제 요구 충족'],
 [/답안 구성이 전체적으로 논리적인가/, '논리적 구성과 전개'],
 [/답안의 언어 사용이 명확하고/, '언어 표현의 명확성'],
 [/<가>의 내용에 따라 단순 평균값/, '평균값 해석의 한계 이해'],
 [/<나>의 SAT 평균 점수 하락의 원인/, '통계 해석의 타당성 검토'],
 [/<나>의 미국 교육위원회의 해석이 오류/, '통계 해석 오류의 원인 설명'],
 [/소문항 1-1 공식 요구:[\s\S]*레오니아/, '소비·폐기 문제 분석과 제시문 적용'],
 [/소문항 1-2 공식 요구:[\s\S]*사회-생태계/, '사회·생태계 관점의 비판과 자료 해석'],
 [/제시문 \[가\]가 국가 경제발전의 핵심 동력/, '제도적 경제발전론 이해'],
 [/제시문 \[다\]와 \[라\]를 통해 제도적 요인/, '제도적 경제발전론의 한계 분석'],
 [/\[마\] ~ \[사\]에서 제시된 비제도적/, '비제도적 경제성장 요인 분석'],
 [/\[마\] ~ \[사\]를 통해서 비제도적/, '한국 경제성장 이론의 한계 분석'],
 [/구성과\s*전개/, '구성과 전개'],[/문장과\s*표현/, '문장과 표현'],
];
export function growthLabel(name:string){
 const clean=name.replace(/\s+/g,' ').trim();
 if(!clean||/비공개|내부 전용|private/i.test(clean)||/^평가\s*항목\s*\d+$/.test(clean))return '평가 기준명 확인 필요';
 const alias=aliases.find(([pattern])=>pattern.test(clean));if(alias)return alias[1];
 // Preserve real, previously unseen titles. Do not replace them with invented competency names.
 return clean.replace(/\(?\s*\d+(?:\.\d+)?\s*%\s*\)?/g,'').trim();
}
