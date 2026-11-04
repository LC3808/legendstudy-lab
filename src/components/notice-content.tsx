'use client';
import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { NOTICE_BUCKET, parseDocument, type NoticeDocument } from '@/lib/notices/document';
export function NoticeImage({path,alt}:{path:string;alt:string}) {
  const {client} = useAuth();
  const [result,setResult] = useState<{path:string;url?:string} | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const r = await client?.storage.from(NOTICE_BUCKET).createSignedUrl(path, 120);
        if (active) setResult({path, url: r?.error ? undefined : r?.data?.signedUrl});
      } catch { if (active) setResult({path}); }
    };
    void refresh(); const timer=setInterval(()=>void refresh(),90000);
    return () => { active=false;clearInterval(timer); };
  },[client,path]);
  if (!result || result.path !== path) return <p role="status">이미지 불러오는 중…</p>;
  if (!result.url) return <p role="status">이미지를 불러오지 못했습니다. {alt}</p>;
  // Private, short-lived storage URL; never arbitrary author HTML or external URLs.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={result.url} alt={alt} style={{maxWidth:'100%',height:'auto',display:'block'}} onError={()=>setResult({path})} />;
}
export function NoticeContent({content,document}:{content:string;document?:NoticeDocument|null}) {
  const doc=parseDocument(document);
  if (!doc) return <p style={{whiteSpace:'pre-wrap'}}>{content}</p>;
  return <div style={{overflowWrap:'anywhere'}}>{doc.blocks.map((b,i)=>b.type==='image'
    ? <figure key={`${i}:${b.path}`} style={{margin:'20px 0'}}><NoticeImage path={b.path} alt={b.alt}/><figcaption>{b.alt}</figcaption></figure>
    : <p key={i} style={{whiteSpace:'pre-wrap',fontSize:b.size,fontWeight:b.bold?700:400,textDecoration:b.underline?'underline':undefined,lineHeight:1.7}}>{b.text}</p>)}</div>;
}
