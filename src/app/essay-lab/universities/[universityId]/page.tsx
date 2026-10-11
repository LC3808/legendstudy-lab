import {notFound} from 'next/navigation';
import {publicCatalog,catalogUniversity} from '@/lib/essay-runtime/public-discovery';
import {UniversityCatalogDetail} from '@/components/university-catalog-detail';
import {buildMetadata} from '@/lib/brand';
export const dynamicParams=false;
export function generateStaticParams(){return publicCatalog.universities.map(u=>({universityId:u.sourceUniversityId}));}
export async function generateMetadata({params}:{params:Promise<{universityId:string}>}){const {universityId}=await params;return buildMetadata(catalogUniversity(universityId)?.name??'대학 찾기','논술 전형과 기출문항');}
export default async function Page({params}:{params:Promise<{universityId:string}>}){const {universityId}=await params;const u=catalogUniversity(universityId);if(!u)notFound();return <UniversityCatalogDetail university={u}/>;}
