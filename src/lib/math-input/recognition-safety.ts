/** Deterministic review policy. Confidence never establishes source fidelity. */
export function hasUnresolvedRecognition(text: string): boolean {
  return /UNCERTAIN|UNREADABLE|판독\s*불가|인식\s*불명|불명확|\[\s*\?[^\]]*\]|�/i.test(text);
}
export function criticalMath(text: string): boolean {
  return /[0-9⁰-⁹₀-₉²³¹⁺⁻+−±=<>≤≥^_∫()[\]{}]|\\(?:frac|sqrt|int|times|leq|geq)|[a-z]\s*[-/]/i.test(text);
}
export function validSourceBox(row: {x:number;y:number;width:number;height:number}): boolean {
  return [row.x,row.y,row.width,row.height].every(Number.isFinite) && row.x>=0 && row.y>=0 && row.width>0 && row.height>0 && row.x+row.width<=1 && row.y+row.height<=1;
}
/** Only call with authoritative worker claim / immutable mixed-session snapshot. */
export function assertRecognizedInputConfirmed(context: Record<string,unknown>, extractionId: string|null): void {
  const attempt=context.attempt as Record<string,unknown>;
  const regions=(context.extraction??[]) as Record<string,unknown>[];
  const confirmed=context.confirmed_input as Record<string,unknown>|null;
  if (regions.length && !extractionId) throw Error('MATH_CONFIRMATION_REQUIRED');
  if (['EVIDENCE','MIXED'].includes(String(attempt.input_kind)) && !extractionId && confirmed?.kind!=='confirmed-math-v1') throw Error('MATH_CONFIRMATION_REQUIRED');
  if (regions.some(r=>r.uncertain===true || hasUnresolvedRecognition(String(r.raw_text??'')+' '+String(r.normalized_math??''))) || hasUnresolvedRecognition(String(attempt.typed_answer??''))) throw Error('MATH_RECOGNITION_UNRESOLVED');
}
