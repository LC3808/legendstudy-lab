'use client';
import { useRef, useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { NoticeContent, NoticeImage } from '@/components/notice-content';
import { parseDocument, plainContent, textBlock, type NoticeDocument, type TextBlock } from '@/lib/notices/document';
import { uploadNoticeImage } from '@/lib/notices/media';
export function NoticeEditor({content,document:docValue,onChange,onBusyChange}:{content:string;document?:NoticeDocument|null;onChange:(content:string,doc:NoticeDocument)=>void;onBusyChange:(busy:boolean)=>void}) {
  const {client,user}=useAuth();
  const doc=parseDocument(docValue, true) ?? {version:1 as const,blocks:[textBlock(content)]};
  const [preview,setPreview]=useState(false), [uploading,setUploading]=useState(false), [error,setError]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);
  function change(blocks:NoticeDocument['blocks']) { if(blocks.reduce((sum,b)=>sum+(b.type==='text'?b.text.length:0),0)>45000){setError('본문은 총 45,000자까지 입력할 수 있어요.');return;} const next:NoticeDocument={version:1,blocks};onChange(plainContent(next),next); }
  function patch(i:number,p:Partial<TextBlock>) { change(doc.blocks.map((b,j)=>j===i&&b.type==='text'?{...b,...p}:b)); }
  async function upload(file?:File) {
    if (!file || !client || !user || uploading) return;
    setError('');setUploading(true);onBusyChange(true);
    try {
      if (doc.blocks.filter(b=>b.type==='image').length>=8 || doc.blocks.length>=100) throw new Error('이미지는 최대 8개, 문단은 최대 100개까지 추가할 수 있어요.');
      const path=await uploadNoticeImage(client,user.id,file);
      change([...doc.blocks,{type:'image',path,alt:file.name.replace(/\.[^.]+$/,'').slice(0,300)||'공지 이미지'}]);
    } catch(e) { setError(e instanceof Error?e.message:'이미지 첨부에 실패했습니다. 본문은 보존됩니다.'); }
    finally {setUploading(false);onBusyChange(false);if(fileRef.current)fileRef.current.value='';}
  }
  return <section aria-label="공지 본문 편집기" style={{minWidth:0}}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
      <button type="button" className="button button--outline" onClick={()=>setPreview(!preview)}>{preview?'편집하기':'미리보기'}</button>
      <button type="button" className="button button--outline" disabled={uploading||doc.blocks.length>=100} onClick={()=>change([...doc.blocks,textBlock()])}>문단 추가</button>
      <button type="button" className="button button--outline" disabled={uploading||doc.blocks.filter(b=>b.type==='image').length>=8} onClick={()=>fileRef.current?.click()}>{uploading?'이미지 업로드 중…':'이미지 첨부'}</button>
      <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0])}/>
    </div>
    <p>문단별로 굵기·밑줄·크기를 설정할 수 있어요. 이미지는 JPG·PNG·WebP, 각 5MB 이하, 최대 8개입니다.</p>
    <p>현재 앱 버전은 본문과 이미지 설명을 텍스트로 표시합니다. 서식과 이미지는 WEB에서 확인할 수 있어요.</p>
    {error&&<p role="alert">{error}</p>}
    {preview?<NoticeContent content={content} document={doc}/>:<fieldset disabled={uploading} style={{border:0,padding:0,minWidth:0}}>
      {doc.blocks.map((b,i)=><div key={i} style={{border:'1px solid var(--border, #ccd3df)',borderRadius:12,padding:12,marginBottom:12,minWidth:0}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
          <span>{b.type==='text'?'문단':'이미지'} {i+1}</span>
          {b.type==='text'&&<>
            <button type="button" aria-label={`문단 ${i+1} 굵게`} aria-pressed={b.bold} onClick={()=>patch(i,{bold:!b.bold})}><strong>굵게</strong></button>
            <button type="button" aria-label={`문단 ${i+1} 밑줄`} aria-pressed={b.underline} onClick={()=>patch(i,{underline:!b.underline})}><u>밑줄</u></button>
            <label>글자 크기 <select aria-label={`문단 ${i+1} 글자 크기`} value={b.size} onChange={e=>patch(i,{size:Number(e.target.value) as TextBlock['size']})}>
              {([16,18,22,28] as const).map((n,j)=><option key={n} value={n}>{['본문','큰 본문','소제목','제목'][j]}</option>)}
            </select></label>
          </>}
          <button type="button" aria-label={`항목 ${i+1} 위로`} disabled={i===0} onClick={()=>{const bs=[...doc.blocks];[bs[i-1],bs[i]]=[bs[i],bs[i-1]];change(bs);}}>↑</button>
          <button type="button" aria-label={`항목 ${i+1} 아래로`} disabled={i===doc.blocks.length-1} onClick={()=>{const bs=[...doc.blocks];[bs[i+1],bs[i]]=[bs[i],bs[i+1]];change(bs);}}>↓</button>
          <button type="button" aria-label={`항목 ${i+1} 제거`} disabled={doc.blocks.length===1} onClick={()=>change(doc.blocks.filter((_,j)=>i!==j))}>제거</button>
        </div>
        {b.type==='text'?<textarea aria-label={`본문 문단 ${i+1}`} rows={4} maxLength={45000} value={b.text} onChange={e=>patch(i,{text:e.target.value})} style={{width:'100%',fontSize:b.size,fontWeight:b.bold?700:400,textDecoration:b.underline?'underline':undefined}}/>:<>
          <NoticeImage path={b.path} alt={b.alt}/>
          <label>이미지 설명 <input required maxLength={300} value={b.alt} onChange={e=>change(doc.blocks.map((x,j)=>i===j?{...b,alt:e.target.value}:x))} style={{width:'100%'}}/></label>
        </>}
      </div>)}
    </fieldset>}
  </section>;
}
