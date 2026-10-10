// @vitest-environment jsdom
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect} from 'vitest';
import {ResearchCatalogView,ResearchUniversityView} from './essay-research-preview';
import {syntheticCatalog} from '@/lib/essay-research/synthetic-fixture';
it('filters university search and reuses year route',()=>{render(<ResearchCatalogView catalog={syntheticCatalog()}/>);expect(screen.getByRole('link',{name:'2027학년도 전형 보기'})).toHaveAttribute('href','/essay-lab/universities/synthetic-university/2027');fireEvent.change(screen.getByLabelText('지역'),{target:{value:'nonseoul'}});expect(screen.getByText('일치하는 대학이 없습니다.')).toBeVisible()});
it('renders unknown source facts without enabling evaluation',()=>{const c=syntheticCatalog();c.offerings[0].metadataState='QUARANTINED';render(<ResearchUniversityView catalog={c} id='synthetic-university' year='2027'/>);expect(screen.getByRole('button',{name:'첨삭 연결 전'})).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent('원자료를 정정하지 않았습니다');expect(screen.getByText('NOT PUBLISHED')).toBeInTheDocument();expect(screen.queryByRole('link',{name:/첨삭/})).toBeNull()});
