// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {EvaluationReport} from './evaluation-report';
import {mathReport} from '@/lib/my/evaluation-report';
vi.mock('./voice-feedback',()=>({VoiceFeedback:()=> <button>음성으로 듣기</button>}));
const report=mathReport({output:{overall:{explanation:'저장된 평가'},steps:[{position:1,status:'VALID',explanation:'타당한 풀이',representation:'x=2'}]}});
it.each(['math','science',undefined] as const)('excludes voice for %s without removing text feedback',voiceType=>{
 render(<EvaluationReport report={report} title="평가" voiceType={voiceType}/>);
 expect(screen.queryByRole('button',{name:'음성으로 듣기'})).toBeNull();
 expect(screen.getByText('저장된 평가')).toBeVisible();expect(screen.getByText('타당한 풀이')).toBeVisible();
});
it.each(['humanities_social','business_economics'] as const)('retains voice for %s',voiceType=>{
 render(<EvaluationReport report={report} title="평가" voiceType={voiceType}/>);
 expect(screen.getByRole('button',{name:'음성으로 듣기'})).toBeVisible();
});
