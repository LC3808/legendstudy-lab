/** Public chart labels only. Stored rubric names may contain full private marking guidance. */
const labels=new Set(['논제 이해','문제 이해','논리','논리적 구성','논리적 전개','근거 활용','근거의 충실성','구성과 전개','문장과 표현','수학적 표현','계산의 정확성','최종 결론','개념 선택','풀이 전략','경우 분석','그래프 해석']);
export function growthLabel(name:string,index:number){const clean=name.trim();return labels.has(clean)?clean:`평가 항목 ${index+1}`;}
