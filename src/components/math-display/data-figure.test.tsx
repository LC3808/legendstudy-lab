// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';import {it,expect} from 'vitest';import {DataFigure} from './data-figure';
it('retains source values and missing data without inventing graph points',()=>{
 const {container}=render(<DataFigure title="표" source="공식 표 1" unit="명" points={[{label:'A',x:1,y:3,sourceValue:'3'},{label:'B',x:2,y:null,sourceValue:'판독 불가'}]}/>);
 expect(container.querySelectorAll('circle')).toHaveLength(1);expect(screen.getByText('판독 불가')).toBeInTheDocument();expect(screen.getByText('미확인')).toBeInTheDocument();
});
it('rejects nonfinite coordinates and ungrounded graphs',()=>{
 render(<DataFigure title="표" source="" unit="명" points={[{label:'A',x:1,y:NaN,sourceValue:'?'}]}/>);expect(screen.queryByRole('img')).toBeNull();
});
