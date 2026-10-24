// @vitest-environment jsdom
import {render, screen, waitFor} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
import {EssayGrowthCard} from './essay-growth';
import type {EssaySummary} from '@/lib/my/essay-summary';

vi.mock('@/lib/my/essay-dashboard',async original=>({...await original<typeof import('@/lib/my/essay-dashboard')>(),readEssayDashboard:vi.fn(),readMathDashboard:vi.fn()}));
import {readEssayDashboard,readMathDashboard} from '@/lib/my/essay-dashboard';
beforeEach(()=>{vi.mocked(readEssayDashboard).mockResolvedValue([]);vi.mocked(readMathDashboard).mockResolvedValue([]);});

const owner = {id: 'owner'};
vi.mock('@/components/auth-context', () => ({useAuth: () => ({client: {auth: {getSession: async () => ({data: {session: {user: owner}}})}}, user: owner, status: 'authenticated'})}));
vi.mock('@/lib/my/data', () => ({assertOwner: async () => {}}));
vi.mock('@/lib/my/foundation', () => ({readEssaySummary: vi.fn()}));
import {readEssaySummary} from '@/lib/my/foundation';

const summary = (over: Partial<EssaySummary> = {}): EssaySummary => ({sessions: [], points: [], hasMoreSessions: false, hasMoreEvaluations: false, ...over});
const basePoint = {questionId: 'q1', criterionId: 'c1', definitionVersion: 'v1', questionMetadataVersion: 'v1', regimeKey: 'r1', evaluationVersion: 'v1', contractVersion: 'v1', evidenceManifest: 'h', status: 'completed', requestKind: 'student', invalidatedAt: null, completedAt: '2026-10-09T02:00:00Z', supersedesEvaluationId: null};

it('shows the empty state with a start CTA and no invented numbers', async () => {
 vi.mocked(readEssaySummary).mockResolvedValue(summary());
 render(<EssayGrowthCard />);
 await screen.findByRole('link', {name: '논술 LAB 시작하기'});
 expect(screen.queryByText(/곳/)).toBeNull();
});

it('reports the real first→rewrite direction, including a decline', async () => {
 vi.mocked(readEssaySummary).mockResolvedValue(summary({
  sessions: [{id: 's1', universityId: 'u1', universityName: '연세대학교', admissionYear: 2027, questionId: 'q1', questionLabel: '문제', attemptCount: 2, latestActivity: '2026-10-09T03:00:00Z'}],
  points: [
   {...basePoint, evaluationId: 'e1', attemptId: 'a1', submittedAt: '2026-10-09T00:00:00Z', level: 2, criterionId: 'c1'},
   {...basePoint, evaluationId: 'e1', attemptId: 'a1', submittedAt: '2026-10-09T00:00:00Z', level: 4, criterionId: 'c2'},
   {...basePoint, evaluationId: 'e2', attemptId: 'a2', submittedAt: '2026-10-09T03:00:00Z', level: 4, criterionId: 'c1'},
   {...basePoint, evaluationId: 'e2', attemptId: 'a2', submittedAt: '2026-10-09T03:00:00Z', level: 3, criterionId: 'c2'},
  ],
 }));
 render(<EssayGrowthCard />);
 await screen.findByText(/연세대학교 논술에 도전했어요/);
 await waitFor(() => expect(screen.getByText('향상 1')).toBeTruthy());
 expect(screen.getByText('하락 1')).toBeTruthy();
});

it('shows current exam History counts even when the legacy summary has no sessions',async()=>{
 vi.mocked(readEssaySummary).mockResolvedValue(summary());
 vi.mocked(readEssayDashboard).mockResolvedValue([{id:'run',source:'exam',question:'문제',university:'성균관대학교',at:'2026-10-24',rewrite:true,evaluations:[{id:'result',status:'completed',at:'2026-10-24',completedAt:'2026-10-24',valid:true}]}]);
 render(<EssayGrowthCard/>);
 await screen.findByText('나의 논술 첨삭과 재작성 기록이 있어요.');
 expect(screen.queryByText(/아직 논술 기록이 없어요/)).toBeNull();
 expect(screen.getAllByText('1개')).toHaveLength(3);
 expect(screen.getByRole('link',{name:'나의 첨삭 기록'}).getAttribute('href')).toMatch(/^\/my\/essays\/?$/);
});
it('does not claim empty history when current records cannot be read',async()=>{
 vi.mocked(readEssaySummary).mockResolvedValue(summary());vi.mocked(readEssayDashboard).mockRejectedValue(Error('unavailable'));
 render(<EssayGrowthCard/>);await screen.findByRole('alert');expect(screen.queryByText(/아직 논술 기록이 없어요/)).toBeNull();
});
