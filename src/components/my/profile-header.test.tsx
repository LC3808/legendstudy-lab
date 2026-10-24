// @vitest-environment jsdom
import {render, screen, waitFor} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import {ProfileHeader} from './profile-header';

const owner = {id: 'owner', email: 'me@legendstudy.com'};
vi.mock('@/components/auth-context', () => ({useAuth: () => ({client: {auth: {getSession: async () => ({data: {session: {user: owner}}})}}, user: owner, status: 'authenticated'})}));
vi.mock('@/components/admin/admin-school-name', () => ({AdminSchoolName: () => <span>검증고등학교</span>}));
vi.mock('@/lib/admin/school', () => ({lookupSchoolName: async () => '검증고등학교'}));

const profile = {display_name: null as string | null, neis_office_code: null as string | null, neis_school_code: null as string | null, academic_status: null as string | null, grade_level: null as number | null};
vi.mock('@/lib/my/data', () => ({assertOwner: async () => {}, readMyProfile: vi.fn()}));
import {readMyProfile} from '@/lib/my/data';

it('shows a nickname with the email beneath it, and school·grade only when set', async () => {
 vi.mocked(readMyProfile).mockResolvedValue({...profile, display_name: '별명', neis_office_code: 'B10', neis_school_code: '7', academic_status: 'student', grade_level: 2});
 const {container} = render(<ProfileHeader />);
 await screen.findByText('별명');
 expect(container.querySelector('.my-profile-card__name')?.textContent).toBe('별명');
 expect(screen.getByText('me@legendstudy.com')).toBeTruthy();
 expect(screen.getByText('검증고등학교')).toBeTruthy();
 expect(screen.getByText('2학년')).toBeTruthy();
});

it('uses the email as the name when no nickname is set and never repeats it', async () => {
 vi.mocked(readMyProfile).mockResolvedValue({...profile});
 const {container} = render(<ProfileHeader />);
 await waitFor(() => expect(container.querySelector('.my-profile-card__name')?.textContent).toBe(''));
 expect(container.querySelectorAll('.my-identity__email')).toHaveLength(1);
 expect(container.textContent).not.toContain('미설정');
});
