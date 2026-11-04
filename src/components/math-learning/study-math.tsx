import {MathDocument} from '../math-display/math-document';
import {Formula} from '../math-display/math-text';
/** Display projection; stored transcripts and server disclosure boundaries are unchanged. */
export function StudyMath({value,formula=false}:{value:unknown;formula?:boolean}) {
 const source=typeof value==='string'?value:'';
 return formula&&!/[가-힣]|\$|\\\[|\\\(/.test(source)?<Formula source={source} display/>:<MathDocument text={source}/>;
}
