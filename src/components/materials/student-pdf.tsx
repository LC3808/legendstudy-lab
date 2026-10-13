'use client';
import {useCallback} from 'react';
import {useAuth} from '@/components/auth-context';
import {hashPdf} from '@/lib/materials/pdf';
import {type StudentPdf} from '@/lib/materials/student-asset';
import {MaterialPdfViewer} from './pdf-viewer';
import './materials.css';
export function StudentQuestionPdf({asset,owner}:{asset:StudentPdf;owner:string}){
 const auth=useAuth();
 const load=useCallback(async()=>{if(!auth.client||auth.user?.id!==owner)throw Error('LOGIN_REQUIRED');const {data,error}=await auth.client.storage.from('essay-student-questions').download(asset.assetId+'.pdf');if(error||!data)throw Error('PDF_UNAVAILABLE');const bytes=new Uint8Array(await data.arrayBuffer());if(await hashPdf(bytes)!==asset.sha256)throw Error('ASSET_CHANGED');return bytes;},[auth.client,auth.user?.id,asset,owner]);
 return <MaterialPdfViewer load={load} positionKey={`essay-pdf:${owner}:${asset.assetId}:${asset.sha256}`} jumpPage={asset.startPage}/>;
}
