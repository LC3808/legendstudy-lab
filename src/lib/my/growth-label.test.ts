import {expect,it} from 'vitest';
import {growthLabel} from './growth-label';
it('keeps exact supplied titles without a limited allowlist',()=>{for(const name of ['논지 전개','주장의 타당성','반론 검토'])expect(growthLabel(name)).toBe(name);});
it('names stored question-style criteria by their actual meaning',()=>{
 expect(growthLabel('각 입장을 빠짐없이 정확하게 요약하였는가?')).toBe('입장 요약의 정확성');
 expect(growthLabel('답안 구성이 전체적으로 논리적인가.')).toBe('논리적 구성과 전개');
 expect(growthLabel('소문항 1-1 공식 요구: 레오니아의 문제 상황')).toBe('소비·폐기 문제 분석과 제시문 적용');
});
it('does not invent a competency when a source title is missing',()=>expect(growthLabel('평가 항목 1')).toBe('평가 기준명 확인 필요'));

it('shortens only criteria with identifiable source meaning',()=>{expect(growthLabel('Ÿ 제시문 ①, ②, ③을 활용하여 답안을 구성했으며 해결 방안의 근거로 삼은 경우')).toBe('제시문 이해와 해결 방안 적용');expect(growthLabel('[가]-[라] 지문의 바른 연계를 통한 논지 구성, 타자 지향성')).toBe('타자 지향성과 제시문의 연계');});
