import {RecognitionReplay} from './replay';
export default function Page(){return process.env.NEXT_PUBLIC_COMMERCE_TEST_ENABLED==='true'?<RecognitionReplay/>:<main>검수 환경에서만 확인할 수 있습니다.</main>;}
