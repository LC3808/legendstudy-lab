import {notFound} from 'next/navigation';
import {AdminSurface} from '@/components/admin/admin-surface';
import {ADMIN_NAV} from '@/lib/admin/navigation';
import {AdminDataPage} from '@/components/admin/admin-data-page';
export const metadata={title:'학습·서비스 분석',robots:{index:false,follow:false}};
export function generateStaticParams(){return ['overview','visitors','conversion','installs','learning','universities','materials-data','study','scores','applications','students','insights','essay-usage','samples','satisfaction','verification'].map(section=>({section}));}
export default async function Page({params}:{params:Promise<{section:string}>}){
 const {section}=await params;const entry=ADMIN_NAV.find(e=>e.href===`/admin/data/${section}/`);if(!entry)notFound();
 return <AdminSurface active="data" eyebrow="LEGENDSTUDY / DATA" title={entry.label}><AdminDataPage section={section}/></AdminSurface>;
}
