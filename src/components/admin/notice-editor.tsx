'use client';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import type Quill from 'quill';
import { useAuth } from '@/components/auth-context';
import { NoticeContent, NoticeImage } from '@/components/notice-content';
import { plainContent, toRich, type NoticeDocument, type ImageBlock } from '@/lib/notices/document';
import { uploadNoticeImage } from '@/lib/notices/media';

const Surface=dynamic(()=>import('@/components/rich-text/quill-surface'),{ssr:false});
export function renderPhoto(photo: ImageBlock) {
  return <><NoticeImage path={photo.path} alt={photo.alt}/><figcaption>{photo.alt}</figcaption></>;
}
export function NoticeEditor({content,document,onChange,onBusyChange,disabled=false}:{
  content:string;document?:NoticeDocument|null;onChange:(content:string,doc:NoticeDocument)=>void;
  onBusyChange:(busy:boolean)=>void;disabled?:boolean;
}) {
  const {client,user}=useAuth();
  const value=useMemo(()=>toRich(content,document),[content,document]);
  const editor=useRef<Quill|null>(null), file=useRef<HTMLInputElement>(null), index=useRef(0);
  const [preview,setPreview]=useState(false), [uploading,setUploading]=useState(false), [error,setError]=useState('');
  function chooseFile(){
    if (!editor.current) return;
    if(value.blocks.filter(b=>b.type==='image').length>=8){setError('사진은 최대 8장까지 첨부할 수 있습니다.');return;}
    index.current=editor.current.getSelection()?.index ?? index.current;
    file.current?.click();
  }
  async function addPhoto(selected?: File){
    const q=editor.current;
    if (!selected || !q || !client || !user) return;
    const alt=window.prompt('사진 설명',selected.name.replace(/\.[^.]+$/,'').slice(0,300))?.trim();
    if(file.current) file.current.value='';
    if(!alt) return;
    if(alt.length>300){setError('사진 설명은 300자까지 입력할 수 있습니다.');return;}
    setUploading(true);onBusyChange(true);setError('');
    try{
      const path=await uploadNoticeImage(client,user.id,selected);
      if(q!==editor.current)return;
      q.enable();
      q.insertEmbed(index.current,'boardPhoto',{type:'image',path,alt},'user');
      q.setSelection(index.current+1,0);
    }catch(e){setError(e instanceof Error?e.message:'사진 첨부에 실패했습니다.');}
    finally{setUploading(false);onBusyChange(false);}
  }
  return <section aria-label="공지 본문 편집기"><div className="rich-actions">
    <button type="button" onClick={()=>setPreview(!preview)}>{preview?'편집하기':'미리보기'}</button>
    {!preview && <>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={chooseFile}>사진 첨부</button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>editor.current?.history.undo()}>실행 취소</button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>editor.current?.history.redo()}>다시 실행</button>
    </>}
    <input hidden type="file" ref={file} accept="image/png,image/jpeg,image/webp" onChange={e=>void addPhoto(e.target.files?.[0])}/>
  </div>
  {error && <p role="alert">{error}</p>}
  <div hidden={preview}><Surface value={value} disabled={uploading||disabled} renderPhoto={renderPhoto} onReady={q=>{
      editor.current=q;
      if (q) {
        index.current=q.getLength()-1;
        q.on('selection-change',range=>{if(range) index.current=range.index;});
      }
    }}
    onChange={doc=>onChange(plainContent(doc),doc)}/></div>
  {preview && <NoticeContent content={content} document={document}/>}
  </section>;
}
