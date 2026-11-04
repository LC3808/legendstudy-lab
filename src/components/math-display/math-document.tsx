import {Formula,MathText} from './math-text';

/** A lossless display projection. No OCR correction, calculation or stored-value rewrite. */
export function isolatedMath(source:string){
 const words=source.replace(/\\[A-Za-z]+|\{(?:p|b|B|v|V)?matrix\}|\{(?:aligned|cases|array)\}/g,'').match(/[A-Za-z]{2,}/g)??[];
 return !/[가-힣]/.test(source)&&words.every(w=>/^(sin|cos|tan|log|ln|lim|max|min|exp|det|dx|dy|dt)$/.test(w))&&/\\[A-Za-z]+|[=^_∫√≤≥<>]/.test(source);
}
function Line({text}:{text:string}){
 // A compact leading problem label is prose. Never split explicit TeX blocks
 // or multiplication such as (1-2)u; every source character remains visible.
 const label=text.match(/^(\s*\(\d+-\d+\)[ \t]+)(\S[\s\S]*)$/);
 if(label)return <><span className="math-document-label">{label[1]}</span><Line text={label[2]}/></>;
 // Korean prose boundaries are retained verbatim, including terminal numerical conclusions.
 if(!/\\[A-Za-z]+|[=^_∫√≤≥<>]/.test(text))return <MathText text={text}/>;
 const parts=text.split(/([가-힣]+[^A-Za-z0-9\\=^_∫√≤≥<>]*)/g);
 return <>{parts.map((part,i)=>isolatedMath(part.trim())?<Formula key={i} source={part} display/>:<MathText key={i} text={part}/>)}</>;
}
function Table({source}:{source:string}){
 const rows=source.split('\n').map(r=>r.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim()));
 const hasHeader=rows.length>1&&rows[1].every(c=>/^:?-{3,}:?$/.test(c));
 if(rows.length<2||rows[0].length<2||rows.some(r=>r.length!==rows[0].length))return <MathText text={source}/>;
 return <span style={{display:'block',overflowX:'auto'}}><span role="table" style={{display:'table',borderCollapse:'collapse'}}>{rows.filter((_,i)=>!hasHeader||i!==1).map((row,i)=><span role="row" style={{display:'table-row'}} key={i}>{row.map((cell,j)=>hasHeader&&i===0?<span role="columnheader" style={{display:'table-cell',padding:8,border:'1px solid #dcd5f1',fontWeight:600}} key={j}><Line text={cell}/></span>:<span role="cell" style={{display:'table-cell',padding:8,border:'1px solid #dcd5f1'}} key={j}><Line text={cell}/></span>)}</span>)}</span></span>;
}
export function MathDocument({text}:{text:string}){
 // Keep delimited blocks and multiline TeX environments whole; never split a matrix row.
 const chunks=text.split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$[^$\n]+?\$|\\begin\{(?!document)[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\})/g);
 return <span className="math-document" style={{display:'block',whiteSpace:'pre-wrap',overflowWrap:'anywhere',minWidth:0}}>{chunks.map((chunk,i)=>{
  if(/^(\$|\\\[|\\\()/.test(chunk))return <MathText key={i} text={chunk}/>;
  if(chunk.startsWith('\\begin{'))return <Formula key={i} source={chunk} display/>;
  const blocks=chunk.split(/(^[^\n]*[ \t]\|[ \t][^\n]*(?:\n[^\n]*[ \t]\|[ \t][^\n]*)+|^[ \t]*\|[^\n]*\|[ \t]*(?:\n[ \t]*\|[^\n]*\|[ \t]*)+)/m);
  return <span key={i}>{blocks.map((block,j)=>block.includes('\n')&&block.split('\n').every(row=>row.includes('|'))?<Table key={j} source={block.trim()}/>:block.split('\n').map((line,k)=><span key={`${j}/${k}`} style={{display:'block',minHeight:line?'':'1em'}}><Line text={line}/></span>))}</span>;
 })}</span>;
}
