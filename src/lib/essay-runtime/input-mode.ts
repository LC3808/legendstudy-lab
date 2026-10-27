import imageInputs from '../../data/essay-image-inputs.json';
// Public identity-only projection of existing Math input contracts (2026-10-27).
// Input capability is independent of launch approval; this never authorizes submission.
export function questionSupportsImages(examId:string|null|undefined,questionId:string|null|undefined,mode?:string){
 return mode==='image'||!!(examId&&questionId&&(imageInputs as Record<string,string[]>)[examId]?.includes(questionId));
}
