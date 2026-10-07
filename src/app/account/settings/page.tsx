import { AccountSettings } from '@/components/my/dashboard';
import { buildMetadata } from '@/lib/brand';
export const metadata=buildMetadata('계정 설정','계정을 관리하세요.');
export default function Page(){return <AccountSettings/>;}
