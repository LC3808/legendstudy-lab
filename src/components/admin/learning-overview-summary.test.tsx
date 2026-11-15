// @vitest-environment jsdom
import {render,screen,cleanup,within} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import {LearningSummary} from './learning-overview-summary';
import {parseLearningAnalytics} from '@/lib/admin/learning-analytics';
afterEach(cleanup);
const base={version:'admin-learning-analytics-v1',as_of:'2026-11-01Z',from:'2026-10-01Z',to:'2026-11-01Z',timezone:'Asia/Seoul',minimum_sample:1,state:'READY',metrics:{targets:2,saved:8,recent:10,applications:3,study_users:2,study_ms:3600000},rows:[]};
it('does not turn a missing additive contract into zero',()=>{
 render(<LearningSummary data={parseLearningAnalytics(base)}/>);
 expect(screen.getAllByText('미확인')).toHaveLength(4);
 expect(screen.getByText(/일별 집계 미연결/)).toBeInTheDocument();
 expect(screen.getByText('관심·지원 교차 집계 미연결')).toBeInTheDocument();
});
it('uses server unique users and labels current intersection without a conversion claim',()=>{
 render(<LearningSummary data={parseLearningAnalytics({...base,metrics:{...base.metrics,active_users:6,saved_users:4,recent_users:5,application_users:2},study_daily:[{date:'2026-10-01',ms:3600000,users:2}],interest_application:{matching_records:1,matching_students:1,basis:'current_interest_same_university_and_admission_year'}})}/>);
 expect(screen.getByText('6명')).toBeInTheDocument();
 expect(screen.getByText(/전환율이 아닙니다/)).toBeInTheDocument();
 const row=screen.getByRole('row',{name:/2026-10-01/});
 expect(within(row).getByText('1시간 0분')).toBeInTheDocument();
 expect(screen.getByText('2건')).toBeInTheDocument();
});
