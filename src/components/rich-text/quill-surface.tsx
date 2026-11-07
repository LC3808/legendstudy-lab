'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Quill, { Delta } from 'quill';
import { BlockEmbed } from 'quill/blots/block';
import { SizeStyle } from 'quill/formats/size';
import type { ReactNode } from 'react';
import { allowedAttribute, imagePath, sizes, type Attributes, type ImageBlock, type RichDocument } from '@/lib/notices/document';
import 'quill/dist/quill.snow.css';
import './rich-text.css';

class BoardPhoto extends BlockEmbed {
  static blotName = 'boardPhoto';
  static tagName = 'ls-board-photo';
  static className = 'board-photo';
  static create(photo: ImageBlock) {
    const el = super.create() as HTMLElement;
    el.contentEditable = 'false';
    el.dataset.path = photo.path;
    el.dataset.alt = photo.alt;
    el.attachShadow({mode:'open'});
    return el;
  }
  static value(el: HTMLElement) {
    return {type:'image',path:el.dataset.path,alt:el.dataset.alt};
  }
}
SizeStyle.whitelist = sizes;
Quill.register(SizeStyle, true);
Quill.register(BoardPhoto, true);

function contents(doc: RichDocument) {
  const delta = new Delta();
  for (const block of doc.blocks) {
    if (block.type === 'image') delta.insert({boardPhoto:block});
    else delta.insert(block.text, block.attributes);
  }
  return delta;
}
function snapshot(q: Quill): RichDocument {
  const blocks: RichDocument['blocks'] = [];
  for (const op of q.getContents().ops) {
    if (typeof op.insert === 'string') {
      const attributes = Object.fromEntries(Object.entries(op.attributes ?? {}).filter(([k,v])=>allowedAttribute(k,v)));
      blocks.push({type:'text',text:op.insert,attributes:attributes as Attributes});
    } else if (op.insert?.boardPhoto) blocks.push(op.insert.boardPhoto as ImageBlock);
  }
  return {version:2,blocks};
}
const toolbar = [
  [{header:[1,2,false]},{size:['12px','14px',false,'18px','22px','28px','36px']}], ['bold','italic','underline','strike'],
  [{color:[]},{background:[]}], [{align:[]}],
  [{list:'ordered'},{list:'bullet'},{indent:'-1'},{indent:'+1'},'blockquote'],
  ['link','clean']
];
const labels: Record<string,string> = {header:'문단 스타일',size:'글자 크기',bold:'굵게',italic:'기울임',underline:'밑줄',strike:'취소선',color:'글자색',background:'글자 배경색',align:'문단 정렬',list:'목록',indent:'들여쓰기',blockquote:'인용',link:'링크',clean:'서식 지우기'};

export type SurfaceProps = {
  value: RichDocument;
  onChange?: (doc: RichDocument)=>void;
  onReady?: (q: Quill|null)=>void;
  renderPhoto: (photo: ImageBlock)=>ReactNode;
  disabled?: boolean;
};
export default function QuillSurface(props: SurfaceProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  useLayoutEffect(()=>{latest.current=props;});
  const instance = useRef<Quill|null>(null);
  const emitted = useRef<RichDocument|null>(null);
  const [photos,setPhotos] = useState<HTMLElement[]>([]);
  const editing = !!props.onChange;
  useEffect(()=>{
    const container = host.current!;
    const root = document.createElement('div');
    container.append(root);
    const q = new Quill(root,{theme:'snow', readOnly:!editing,
      formats:[...Object.keys(labels).filter(k=>k!=='clean'),'boardPhoto'],
      modules:{toolbar:editing ? {container:toolbar,handlers:{
        link(this:{quill:Quill}, enabled:boolean){
          if (!enabled) {this.quill.format('link',false,'user');return;}
          const url=window.prompt('연결할 주소 (https:// 또는 http://)')?.trim();
          if (!url) return;
          if (!allowedAttribute('link',url)){window.alert('http 또는 https 주소를 입력해 주세요.');return;}
          const range=this.quill.getSelection(true);
          if(range.length) this.quill.formatText(range.index,range.length,'link',url,'user');
          else this.quill.insertText(range.index,url,{link:url},'user');
        }
      }} : false,history:{userOnly:true},uploader:{handler:()=>{}}}});
    instance.current=q;
    q.root.setAttribute('aria-label','본문');
    if (editing) q.root.setAttribute('role','textbox');
    q.clipboard.addMatcher('ls-board-photo',()=>new Delta());
    for (const el of container.querySelectorAll<HTMLElement>('.ql-toolbar button,.ql-picker-label')) {
      const control = el.matches('button') ? el : el.parentElement!;
      const key = [...control.classList].map(c=>c.slice(3)).find(c=>labels[c]);
      if (!key) continue;
      const val=control.getAttribute('value');
      const label=key==='list' ? (val==='ordered'?'번호 목록':'글머리표') : key==='indent' && val==='-1'?'내어쓰기':labels[key];
      el.setAttribute('aria-label',label); el.title=label;
    }
    const refreshPhotos=()=>setPhotos(Array.from(q.root.querySelectorAll<HTMLElement>('.board-photo')));
    q.setContents(contents(latest.current.value),'silent');
    emitted.current=latest.current.value;
    q.history.clear();
    refreshPhotos();
    const change=()=>{
      refreshPhotos();
      if (editing) {
        emitted.current=snapshot(q);
        latest.current.onChange?.(emitted.current);
      }
    };
    q.on('text-change',change);
    latest.current.onReady?.(q);
    return ()=>{latest.current.onReady?.(null);q.off('text-change',change);q.disable();instance.current=null;container.replaceChildren();};
  },[editing]);
  useEffect(()=>{
    const q=instance.current;
    if(q && props.value!==emitted.current){
      q.setContents(contents(props.value),'silent');
      emitted.current=props.value;
      q.history.clear();
      setPhotos(Array.from(q.root.querySelectorAll<HTMLElement>('.board-photo')));
    }
  },[props.value]);
  useEffect(()=>{instance.current?.enable(editing && !props.disabled);},[editing,props.disabled]);
  return <div className={editing?'rich-editor':'rich-reader'}><div ref={host}/>{photos.map((el,i)=>{
    const photo=BoardPhoto.value(el);
    if (!el.shadowRoot || !photo.path || !imagePath.test(photo.path)) return null;
    function editCaption() {
      const q=instance.current;
      const blot=Quill.find(el);
      if (!q || !blot || blot instanceof Quill) return;
      const alt=window.prompt('사진 설명',photo.alt)?.trim();
      if (!alt || alt===photo.alt) return;
      if (alt.length>300) { window.alert('사진 설명은 300자까지 입력할 수 있습니다.'); return; }
      q.updateContents(new Delta().retain(q.getIndex(blot)).delete(1).insert({boardPhoto:{...photo,alt}}),'user');
    }
    return createPortal(<>{props.renderPhoto({type:'image',path:photo.path,alt:photo.alt??''})}
      {editing && <button type="button" disabled={props.disabled} onClick={editCaption}>사진 설명 수정</button>}</>,el.shadowRoot,String(i));
  })}</div>;
}
