import {Formula, MathText} from '../math-display/math-text';
/** Rendering adapter only. Stored transcripts/AI text are never rewritten. */
export function StudyMath({value,formula=false}:{value:unknown;formula?:boolean}) {
 const source=typeof value==='string'?value:'';
 const explicit=/\$|\\\[|\\\(/.test(source);
 const isolated=!/[가-힣]/.test(source)&&!/[A-Za-z]{3,}/.test(source.replace(/\\[A-Za-z]+|\{(?:p|b|B|v|V)?matrix\}|\{(?:aligned|cases|array)\}/g,''))&&/\\[A-Za-z]+|[=^_∫]/.test(source);
 return formula&&!explicit||isolated&&!explicit?<Formula source={source} display/>:<MathText text={source}/>;
}
