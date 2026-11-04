/** Completed active milliseconds; never display missing as zero. */
export function formatStudyTime(ms:number|null|undefined){
 if(ms==null||!Number.isFinite(ms)||ms<0)return '미확인';
 const minutes=Math.floor(ms/60000);
 return `${Math.floor(minutes/60).toLocaleString('ko-KR')}시간 ${minutes%60}분`;
}
