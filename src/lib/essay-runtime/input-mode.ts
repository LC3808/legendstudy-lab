import inputs from '../../data/essay-question-inputs.json';

type InputMode = 'image' | 'text';
const contracts: Record<string, {examId: string; mode: InputMode}> = inputs as Record<string, {examId: string; mode: InputMode}>;
// Identity-only projection of verified Registry/package input contracts.
// Availability is deliberately not an input: writing capability never grants evaluation approval.
export function questionInputMode(examId: string | null | undefined, questionId: string | null | undefined, mode?: string): InputMode | 'unknown' {
 const contract = questionId ? contracts[questionId] : undefined;
 if (contract) return contract.examId === examId ? contract.mode : 'unknown';
 return mode === 'image' || mode === 'text' ? mode : 'unknown';
}
export function questionSupportsImages(examId: string | null | undefined, questionId: string | null | undefined, mode?: string) {
 return questionInputMode(examId, questionId, mode) === 'image';
}
