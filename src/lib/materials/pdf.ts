import type {PDFDocumentProxy} from 'pdfjs-dist';
/** Local renderer only: no remote worker/CDN, JavaScript or embedded PDF actions. */
export async function openPdf(bytes:Uint8Array,ownerDocument?:HTMLDocument):Promise<PDFDocumentProxy>{
 const path='/pdf.min.mjs';
 const pdf:typeof import('pdfjs-dist')=await import(/* webpackIgnore: true */ path);
 pdf.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
 return pdf.getDocument({data:bytes.slice(),ownerDocument,isEvalSupported:false,enableXfa:false,disableAutoFetch:true}).promise;
}
export async function hashPdf(bytes:Uint8Array){
 if(bytes.length>32*1024*1024||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('PDF_REQUIRED');
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
