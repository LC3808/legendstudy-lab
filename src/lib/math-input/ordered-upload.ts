/** Uses existing artifact registration/storage. No bucket, ownership or evaluation authority here. */
export type UploadPage={file:File;artifactId?:string;present?:boolean};
export type UploadPort={assertOwner:()=>Promise<void>;register:(position:number,file:File)=>Promise<string>;upload:(id:string,file:File)=>Promise<void>};
export async function uploadOrderedPages(pages:UploadPage[],port:UploadPort):Promise<void>{
 if(!pages.length||pages.length>6||pages.some(p=>!['image/jpeg','image/png','image/webp'].includes(p.file.type)||p.file.size<1||p.file.size>20971520))throw Error('INVALID_IMAGES');
 // Freeze order and files before starting. Keep this state for partial retries.
 for(let i=0;i<pages.length;i++){
  const page=pages[i];await port.assertOwner();
  if(page.present)continue;
  if(!page.artifactId)page.artifactId=await port.register(i+1,page.file);
  await port.assertOwner();await port.upload(page.artifactId,page.file);
  await port.assertOwner();page.present=true;
 }
}
