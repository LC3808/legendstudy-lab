import katex from 'katex';
import 'katex/dist/katex.min.css';

export function displayMathSource(source:string){
 // Display existing radical syntax only; preserve explicit index, braces and operands.
 // Only an operand boundary permits a printed superscript to be a root index;
 // x⁴√3 can instead mean x to the fourth times a square root and stays that way.
 const indexed=source.replace(/(^|[\s(,=<>≤≥+*/-])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)√(\{|[A-Za-zα-ωΑ-Ω]|[0-9]+)/g,
  (_,boundary:string,index:string,operand:string)=>{
   const digits=Array.from(index,digit=>'⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(digit)).join('');
   return `${boundary}\\sqrt[${digits}]${operand==='{'?'{':`{${operand}}`}`;
  });
 // A malformed or incomplete expression still falls back to its unchanged source.
 return indexed.replace(/′/g, "'").replace(/√(?=(?:\[[0-9]+\])?\{)/g, '\\sqrt').replace(/√([A-Za-zα-ωΑ-Ω]|[0-9]+)/g,(_,atom:string)=>`\\sqrt{${atom}}`).replace(/([A-Za-z])\u0304/g,(_,letter:string)=>`\\bar{${letter}}`);
}

/** Display only: never rewrites the stored answer or interprets a formula as executable code. */
export function Formula({source, display=false}:{source:string;display?:boolean}) {
 let html:string|null=null;
 try {
  if(source.length>6000)throw Error('TOO_LONG');
  html=katex.renderToString(displayMathSource(source),{displayMode:display,throwOnError:true,trust:false,strict:'error',maxExpand:200,maxSize:20,output:'htmlAndMathml'});
 }catch{ /* Preserve the source if KaTeX rejects it. */ }
 if(html===null)return <span className="math-source-fallback" title="수식 표시를 확인해 주세요. 입력 원문을 보존했습니다."><span className="math-source-warning">수식 표시 오류 · 원문: </span>{source}</span>;
 return <span className="math-formula" style={{display:display?'block':'inline-block',maxWidth:'100%',overflowX:'auto',verticalAlign:'middle'}} dangerouslySetInnerHTML={{__html:html}}/>;
}
export function MathText({text}:{text:string}) {
 // Explicit delimiters only. Currency, ordinary prose and unsupported input stay unchanged.
 const pieces=text.split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$[^$\n]+?\$)/g);
 return <span style={{whiteSpace:'pre-wrap'}}>{pieces.map((part,i)=>{
  const block=part.startsWith('$$')||part.startsWith('\\[');
  const math=block||part.startsWith('\\(')||(part.startsWith('$')&&part.endsWith('$'));
  return math?<Formula key={i} source={part.slice(block||part.startsWith('\\(')?2:1,block||part.startsWith('\\(')?-2:-1)} display={block}/>:part;
 })}</span>;
}
